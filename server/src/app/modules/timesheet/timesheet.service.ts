import { DateTime } from 'luxon';
import { config } from '../../../config/index.js';
import { deriveStatus, type PunchEvent } from '../punch/punch.logic.js';
import type { IPunch } from '../punch/punch.interface.js';
import { Punch } from '../punch/punch.model.js';
import { User } from '../user/user.model.js';
import { toCsv } from './csv.logic.js';
import type { Shift } from './timesheet.interface.js';
import {
  formatLocal,
  msToDecimalHours,
  msToHoursMinutes,
  msToMinutes,
  pairShifts,
  sumPayableMs,
  weekRange,
} from './timesheet.logic.js';

const HOUR_MS = 60 * 60 * 1000;

const options = {
  timezone: config.TIMEZONE,
  openShiftLimitHours: config.OPEN_SHIFT_LIMIT_HOURS,
};

const localDate = (at: Date): string =>
  DateTime.fromJSDate(at, { zone: config.TIMEZONE }).toISODate() ?? '';

/**
 * Shifts for a date range, for one person or everyone.
 *
 * Punches are read from before the range starts, because a shift that began at
 * 22:00 on the Sunday is still Sunday's shift and its clock-out lands inside
 * the range. Reading only the range would orphan that clock-out and both days
 * would be wrong. Shifts are then filtered by the date they *belong* to.
 */
const shiftsInRange = async (
  from: Date,
  to: Date,
  userId?: string,
): Promise<Shift[]> => {
  const lookback = new Date(from.getTime() - config.OPEN_SHIFT_LIMIT_HOURS * HOUR_MS);
  const punches = await Punch.find({
    ...(userId ? { userId } : {}),
    voidedAt: null,
    at: { $gte: lookback, $lt: to },
  })
    .sort({ at: 1 })
    .lean<IPunch[]>();

  // Stored punches carry `_id`; the pure logic works in plain `id` so it never
  // has to know about Mongoose. The mapping happens once, here.
  const byUser = new Map<string, PunchEvent[]>();
  for (const punch of punches) {
    const key = String(punch.userId);
    const event: PunchEvent = {
      id: String(punch._id),
      type: punch.type,
      at: punch.at,
      voidedAt: punch.voidedAt,
    };
    byUser.set(key, [...(byUser.get(key) ?? []), event]);
  }

  const fromDate = localDate(from);
  const toDate = localDate(to);
  const now = new Date();

  return [...byUser.entries()]
    .flatMap(([id, events]) => pairShifts(id, events, options, now))
    .filter((shift) => shift.date >= fromDate && shift.date < toDate)
    .sort((a, b) => a.clockIn.getTime() - b.clockIn.getTime());
};

/**
 * What this person has earned so far this week, shown back to them after a
 * punch.
 *
 * Only finished shifts count. The one they are standing in the middle of is
 * worth nothing yet, because a break they have not taken would change it.
 */
const weekToDatePayableMs = async (userId: string, now: Date): Promise<number> => {
  const { start, end } = weekRange(now, {
    timezone: config.TIMEZONE,
    weekStart: config.PAY_WEEK_START,
  });

  return sumPayableMs(await shiftsInRange(start, end, userId));
};

type TimesheetRow = Shift & { name: string; payrollRef: string | null };

/** Shifts for the manager's table, with the names attached. */
const timesheet = async (
  from: Date,
  to: Date,
): Promise<{ rows: TimesheetRow[]; totalPayableMs: number; needsReview: number }> => {
  const shifts = await shiftsInRange(from, to);
  const users = await User.find({
    _id: { $in: [...new Set(shifts.map((s) => s.userId))] },
  }).lean();

  const nameOf = new Map(
    users.map((user) => [
      String(user._id),
      { name: user.name, payrollRef: user.payrollRef ?? null },
    ]),
  );

  const rows = shifts.map((shift) => ({
    ...shift,
    name: nameOf.get(shift.userId)?.name ?? 'Unknown',
    payrollRef: nameOf.get(shift.userId)?.payrollRef ?? null,
  }));

  return {
    rows,
    totalPayableMs: sumPayableMs(shifts),
    needsReview: shifts.filter((shift) => shift.status !== 'complete').length,
  };
};

const CSV_HEADERS = [
  'Payroll ref',
  'Staff',
  'Shift date',
  'Clock in',
  'Clock out',
  'Unpaid break (minutes)',
  'Payable hours (decimal)',
  'Payable hours (HH:MM)',
  'Status',
] as const;

/**
 * One row per shift, which is what makes the file checkable by hand.
 *
 * A shift awaiting review is exported with its real times and zero payable
 * hours rather than being left out. Dropping it would be a silent shortfall in
 * somebody's pay; showing it with a status is a number a manager can question.
 *
 * Everyone with punches in the range appears, active or not — deactivation ends
 * someone's access, never their claim to a week they actually worked.
 */
const exportCsv = async (from: Date, to: Date): Promise<string> => {
  const { rows } = await timesheet(from, to);

  return toCsv(
    CSV_HEADERS,
    rows.map((row) => [
      row.payrollRef ?? '',
      row.name,
      row.date,
      formatLocal(row.clockIn, config.TIMEZONE),
      formatLocal(row.clockOut, config.TIMEZONE),
      String(msToMinutes(row.breakMs)),
      msToDecimalHours(row.payableMs),
      msToHoursMinutes(row.payableMs),
      row.status,
    ]),
  );
};

/**
 * Who is here right now.
 *
 * Every active staff member appears, including the ones who have not punched at
 * all — "not in" is the answer the manager is looking for as much as "on shift
 * is", and someone with no punches today has no shift to derive it from.
 */
const todayBoard = async (
  now: Date = new Date(),
): Promise<
  {
    userId: string;
    name: string;
    state: ReturnType<typeof deriveStatus>['state'];
    since: Date | null;
    todayPayableMs: number;
  }[]
> => {
  const staff = await User.find({ role: 'employee', isActive: true })
    .sort({ name: 1 })
    .lean();

  const startOfToday = DateTime.fromJSDate(now, { zone: config.TIMEZONE })
    .startOf('day')
    .toJSDate();
  const tomorrow = DateTime.fromJSDate(startOfToday, { zone: config.TIMEZONE })
    .plus({ days: 1 })
    .toJSDate();

  // The state machine needs the whole history to know whether a shift is still
  // open, so this reads back further than today — a shift that began last night
  // is still the shift someone is standing in.
  const lookback = new Date(
    startOfToday.getTime() - config.OPEN_SHIFT_LIMIT_HOURS * HOUR_MS,
  );
  const punches = await Punch.find({
    userId: { $in: staff.map((user) => user._id) },
    voidedAt: null,
    at: { $gte: lookback, $lt: tomorrow },
  })
    .sort({ at: 1 })
    .lean<IPunch[]>();

  const byUser = new Map<string, PunchEvent[]>();
  for (const punch of punches) {
    const key = String(punch.userId);
    byUser.set(key, [
      ...(byUser.get(key) ?? []),
      { id: String(punch._id), type: punch.type, at: punch.at, voidedAt: punch.voidedAt },
    ]);
  }

  const todayDate = localDate(now);

  return staff.map((user) => {
    const events = byUser.get(String(user._id)) ?? [];
    const { state, since } = deriveStatus(
      events,
      now,
      config.OPEN_SHIFT_LIMIT_HOURS,
    );
    const todayPayableMs = sumPayableMs(
      pairShifts(String(user._id), events, options, now).filter(
        (shift) => shift.date === todayDate,
      ),
    );

    return { userId: String(user._id), name: user.name, state, since, todayPayableMs };
  });
};

export const timesheetService = {
  shiftsInRange,
  todayBoard,
  weekToDatePayableMs,
  timesheet,
  exportCsv,
};
