export type ShiftBreak = {
  start: Date;
  end: Date | null;
  /** Zero until the break is closed. Never guessed. */
  ms: number;
  /**
   * The punches behind this break. A manager fixing a forgotten break-end has
   * to amend or insert one specific punch, and an id is the only way to say
   * which — a shift is derived, so there is nothing else to point at.
   */
  startId: string | null;
  endId: string | null;
};

export const SHIFT_STATUSES = ['complete', 'open', 'needs-review'] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const SHIFT_ANOMALIES = [
  /** A later clock-in terminated this shift without one. */
  'missing-clock-out',
  /** A break was still running when the shift ended. */
  'unclosed-break',
  /** Still open past the limit — almost certainly a forgotten clock-out. */
  'exceeds-limit',
] as const;
export type ShiftAnomaly = (typeof SHIFT_ANOMALIES)[number];

/**
 * One worked shift, derived from punches at read time. Never stored — a shift
 * is a view of the events, not a fact of its own.
 */
export type Shift = {
  userId: string;
  /** Local date of the clock-in, so an overnight shift belongs to the day it began. */
  date: string;
  clockIn: Date;
  clockOut: Date | null;
  /** See `ShiftBreak`: what a correction targets. Null when the punch is missing. */
  clockInId: string | null;
  clockOutId: string | null;
  breaks: ShiftBreak[];
  /** Clock-out minus clock-in. Zero while the shift is open. */
  workedMs: number;
  /** Total of closed breaks. Unpaid, so it comes off the payable total. */
  breakMs: number;
  /** Zero unless the shift is `complete`. Anything else is the manager's call. */
  payableMs: number;
  status: ShiftStatus;
  anomalies: ShiftAnomaly[];
};

export type WeekStart = 'monday' | 'sunday';

export type TimesheetOptions = {
  timezone: string;
  openShiftLimitHours: number;
};
