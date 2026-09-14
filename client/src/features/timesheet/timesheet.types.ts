import type { PunchState, PunchType } from '@/features/punch/punch.types.ts';

export type ShiftStatus = 'complete' | 'open' | 'needs-review';

export type ShiftAnomaly = 'missing-clock-out' | 'unclosed-break' | 'exceeds-limit';

export type ShiftBreak = {
  start: string;
  end: string | null;
  ms: number;
  startId: string | null;
  endId: string | null;
};

/** Mirrors the backend `Shift`, plus the name the table shows. */
export type TimesheetRow = {
  userId: string;
  name: string;
  payrollRef: string | null;
  date: string;
  clockIn: string;
  clockOut: string | null;
  clockInId: string | null;
  clockOutId: string | null;
  breaks: ShiftBreak[];
  workedMs: number;
  breakMs: number;
  payableMs: number;
  status: ShiftStatus;
  anomalies: ShiftAnomaly[];
};

export type Timesheet = {
  rows: TimesheetRow[];
  totalPayableMs: number;
  needsReview: number;
};

export type TodayEntry = {
  userId: string;
  name: string;
  state: PunchState;
  since: string | null;
  todayPayableMs: number;
};

export type { PunchType };
