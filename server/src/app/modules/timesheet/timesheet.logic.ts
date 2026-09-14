import { DateTime } from 'luxon';
import { byTime, countsTowardsWork, type PunchEvent } from '../punch/punch.logic.js';
import type {
  Shift,
  ShiftAnomaly,
  ShiftBreak,
  TimesheetOptions,
  WeekStart,
} from './timesheet.interface.js';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/**
 * Three separate concerns, deliberately never conflated:
 *
 * 1. **Duration** is UTC millisecond subtraction, which is DST-correct by
 *    construction. Elapsed time is never computed from wall-clock fields.
 * 2. **Bucketing** — which local day, which week — is the only thing that needs
 *    a timezone, because UTC dates are wrong for roughly seven months a year.
 * 3. **Formatting** happens once, at the very end.
 *
 * The consequence is deliberate and load-bearing: a 22:00-06:00 shift is seven
 * hours on the spring-forward night and nine on the autumn-back night, and is
 * paid as such. Wall-clock accounting would quietly underpay the autumn night
 * by an hour, every year.
 */
const localDate = (at: Date, timezone: string): string =>
  DateTime.fromJSDate(at, { zone: timezone }).toISODate() ?? '';

type Draft = {
  clockIn: Date;
  clockOut: Date | null;
  clockInId: string | null;
  clockOutId: string | null;
  breaks: ShiftBreak[];
};

/**
 * Walks one person's non-voided punches into shifts.
 *
 * Punches that cannot apply are skipped rather than thrown on — a break-end
 * with no open break, a clock-out with no open shift. Assembly runs on read
 * paths that must always return something; the anomalies below are how bad data
 * surfaces, not exceptions.
 */
export const pairShifts = (
  userId: string,
  punches: readonly PunchEvent[],
  options: TimesheetOptions,
  now: Date = new Date(),
): Shift[] => {
  const drafts: Draft[] = [];
  let current: Draft | null = null;
  let openBreak: ShiftBreak | null = null;

  for (const punch of punches.filter(countsTowardsWork).sort(byTime)) {
    switch (punch.type) {
      case 'clock-in':
        // A new clock-in abandons any shift still open. The old one is kept
        // exactly as it was and flagged below; no clock-out is invented for it.
        if (current) drafts.push(current);
        current = {
          clockIn: punch.at,
          clockOut: null,
          clockInId: punch.id ?? null,
          clockOutId: null,
          breaks: [],
        };
        openBreak = null;
        break;

      case 'break-start':
        if (current && !openBreak) {
          openBreak = {
            start: punch.at,
            end: null,
            ms: 0,
            startId: punch.id ?? null,
            endId: null,
          };
          current.breaks.push(openBreak);
        }
        break;

      case 'break-end':
        if (openBreak) {
          openBreak.end = punch.at;
          openBreak.ms = punch.at.getTime() - openBreak.start.getTime();
          openBreak.endId = punch.id ?? null;
          openBreak = null;
        }
        break;

      case 'clock-out':
        if (current) {
          current.clockOut = punch.at;
          current.clockOutId = punch.id ?? null;
          drafts.push(current);
          current = null;
          openBreak = null;
        }
        break;
    }
  }

  if (current) drafts.push(current);

  return drafts.map((draft, index) =>
    finalise(userId, draft, index === drafts.length - 1, options, now),
  );
};

const finalise = (
  userId: string,
  draft: Draft,
  isLast: boolean,
  options: TimesheetOptions,
  now: Date,
): Shift => {
  const breakMs = draft.breaks.reduce((total, b) => total + b.ms, 0);
  const workedMs = draft.clockOut
    ? draft.clockOut.getTime() - draft.clockIn.getTime()
    : 0;

  /**
   * A shift that is still running right now is not a problem to be reviewed.
   * Someone currently on their tea break has an unclosed break and no
   * clock-out, and both are entirely normal until they come back.
   */
  const openFor = now.getTime() - draft.clockIn.getTime();
  const isLive =
    isLast &&
    draft.clockOut === null &&
    openFor <= options.openShiftLimitHours * HOUR_MS;

  const anomalies: ShiftAnomaly[] = [];

  if (!isLive) {
    if (draft.breaks.some((b) => b.end === null)) anomalies.push('unclosed-break');
    if (draft.clockOut === null) {
      anomalies.push(isLast ? 'exceeds-limit' : 'missing-clock-out');
    }
  }

  const status = anomalies.length > 0
    ? 'needs-review'
    : draft.clockOut
      ? 'complete'
      : 'open';

  return {
    userId,
    date: localDate(draft.clockIn, options.timezone),
    clockIn: draft.clockIn,
    clockOut: draft.clockOut,
    clockInId: draft.clockInId,
    clockOutId: draft.clockOutId,
    breaks: draft.breaks,
    workedMs,
    breakMs,
    /**
     * Only a clean, finished shift pays. Anything flagged is worth zero until a
     * manager looks at it — the alternative is paying a number nobody checked.
     */
    payableMs: status === 'complete' ? Math.max(0, workedMs - breakMs) : 0,
    status,
    anomalies,
  };
};

/** Half-open `[start, end)`, which is the shape database range queries want. */
export const weekRange = (
  at: Date,
  { timezone, weekStart }: { timezone: string; weekStart: WeekStart },
): { start: Date; end: Date } => {
  const local = DateTime.fromJSDate(at, { zone: timezone });
  // Luxon numbers weekdays 1 (Monday) to 7 (Sunday).
  const daysIn = weekStart === 'monday' ? local.weekday - 1 : local.weekday % 7;
  const start = local.startOf('day').minus({ days: daysIn });

  return { start: start.toJSDate(), end: start.plus({ days: 7 }).toJSDate() };
};

/** Milliseconds are summed first and rounded once, never the other way round. */
export const sumPayableMs = (shifts: readonly Shift[]): number =>
  shifts.reduce((total, shift) => total + shift.payableMs, 0);

export const msToDecimalHours = (ms: number): string =>
  (ms / HOUR_MS).toFixed(2);

export const msToHoursMinutes = (ms: number): string => {
  const totalMinutes = Math.round(ms / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);

  return `${hours}:${String(totalMinutes % 60).padStart(2, '0')}`;
};

export const msToMinutes = (ms: number): number => Math.round(ms / MINUTE_MS);

/** 24-hour local time, so an overnight shift is never ambiguous on paper. */
export const formatLocal = (at: Date | null, timezone: string): string =>
  at ? DateTime.fromJSDate(at, { zone: timezone }).toFormat('yyyy-MM-dd HH:mm') : '';
