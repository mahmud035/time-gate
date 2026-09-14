/** Mirrors the backend `PunchState`. A drift here breaks the build. */
export type PunchState = 'clocked-out' | 'clocked-in' | 'on-break';

/** Mirrors the backend `PunchType` — the four events actually stored. */
export type PunchType = 'clock-in' | 'break-start' | 'break-end' | 'clock-out';

/** Mirrors the backend `PunchAction`. */
export type PunchAction =
  | 'clock-in'
  | 'break-start'
  | 'break-end'
  | 'clock-out'
  | 'break-end-and-clock-out';

export type StaffStatus = {
  name: string;
  state: PunchState;
  /** ISO instant the current shift or break began. Null when clocked out. */
  since: string | null;
  /**
   * Comes from the server, never decided here. The same `deriveState` that
   * validates the write produces this list, so the screen cannot offer an
   * action the server would refuse.
   */
  nextActions: PunchAction[];
  weekToDatePayableMs: number;
};

export type PunchResult = StaffStatus & {
  at: string;
  /** True when this was a retry of a punch already recorded. */
  replayed: boolean;
};

export const CODE_LENGTH = 4;
