import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../utils/AppError.js';
import type {
  PunchAction,
  PunchState,
  PunchType,
} from './punch.interface.js';

/**
 * The only fields the state machine needs.
 *
 * Deliberately not the Mongoose document: this whole file is pure, so it can be
 * tested without a database and reused by the punch path, the validator and the
 * timesheet assembler without any of them dragging in a model.
 */
export type PunchEvent = {
  type: PunchType;
  at: Date;
  /** Soft-deleted punches are ignored everywhere. Absent means it counts. */
  voidedAt?: Date | null;
};

/**
 * Voided punches are filtered here rather than in each caller's database query,
 * so "a voided punch does not count" is one rule in one place that a forgotten
 * `voidedAt: null` filter cannot quietly undo.
 */
export const countsTowardsWork = (punch: PunchEvent): boolean =>
  punch.voidedAt === null || punch.voidedAt === undefined;

const HOUR_MS = 60 * 60 * 1000;

/**
 * Canonical order for punches sharing one instant.
 *
 * `break-end-and-clock-out` writes two punches at the same millisecond, and a
 * database sort on time alone leaves their relative order undefined — the same
 * shift could come back as a clean day or as "a break-end with nothing to match
 * it" depending on what the storage engine happened to return. Reading it the
 * wrong way round turns a finished shift into a review row and pays zero, so
 * the tie is broken here rather than left to chance.
 *
 * The order is the only one a shift can legitimately run in.
 */
const TYPE_ORDER: Record<PunchType, number> = {
  'clock-in': 0,
  'break-start': 1,
  'break-end': 2,
  'clock-out': 3,
};

/** The single ordering every part of the system reads punches in. */
export const byTime = (a: PunchEvent, b: PunchEvent): number =>
  a.at.getTime() - b.at.getTime() || TYPE_ORDER[a.type] - TYPE_ORDER[b.type];

/**
 * What the punch screen offers, per state.
 *
 * Note that `on-break` does **not** offer a bare "Clock out". Leaving without
 * ending the break is accepted by the server (see `PERMITTED`) but never
 * suggested, because it puts the shift in the manager's review queue for no
 * good reason when "End break & clock out" records the same thing correctly.
 */
const NEXT_ACTIONS: Record<PunchState, readonly PunchAction[]> = {
  'clocked-out': ['clock-in'],
  'clocked-in': ['break-start', 'clock-out'],
  'on-break': ['break-end', 'break-end-and-clock-out'],
};

/**
 * What the server accepts, per state. A superset of what the UI offers.
 *
 * A bare `clock-out` while on a break is permitted because a manager edit can
 * leave someone in that state, and refusing it would strand them.
 */
const PERMITTED: Record<PunchState, readonly PunchAction[]> = {
  'clocked-out': ['clock-in'],
  'clocked-in': ['break-start', 'clock-out'],
  'on-break': ['break-end', 'clock-out', 'break-end-and-clock-out'],
};

/** Plain-English refusals. Staff see these on a tablet, not a status code. */
const REFUSALS: Record<PunchState, string> = {
  'clocked-out': "You're not clocked in yet.",
  'clocked-in': "You're already clocked in.",
  'on-break': "You're on a break.",
};

/**
 * Replays a punch history into the state it leaves someone in, along with when
 * the still-open shift began.
 *
 * A `clock-in` always starts a new shift, even on top of an open one. The old
 * shift is abandoned rather than rejected here — refusing it is the validator's
 * job, and only when the open shift is still fresh.
 *
 * Events that do not fit the current state are skipped rather than thrown on.
 * Stored punches should always form a valid sequence, but this function runs on
 * the path that opens the door: a corrupt row must not raise an exception in
 * front of someone trying to start their shift.
 */
const replay = (
  punches: readonly PunchEvent[],
): {
  state: PunchState;
  shiftStartedAt: Date | null;
  breakStartedAt: Date | null;
} => {
  let state: PunchState = 'clocked-out';
  let shiftStartedAt: Date | null = null;
  let breakStartedAt: Date | null = null;

  for (const punch of punches.filter(countsTowardsWork).sort(byTime)) {
    switch (punch.type) {
      case 'clock-in':
        state = 'clocked-in';
        shiftStartedAt = punch.at;
        breakStartedAt = null;
        break;
      case 'break-start':
        if (state === 'clocked-in') {
          state = 'on-break';
          breakStartedAt = punch.at;
        }
        break;
      case 'break-end':
        if (state === 'on-break') {
          state = 'clocked-in';
          breakStartedAt = null;
        }
        break;
      case 'clock-out':
        if (state !== 'clocked-out') {
          state = 'clocked-out';
          shiftStartedAt = null;
          breakStartedAt = null;
        }
        break;
    }
  }

  return { state, shiftStartedAt, breakStartedAt };
};

/**
 * What this person can do right now.
 *
 * **A stale shift must never block the door.** If the open shift began longer
 * ago than the limit, this reports `clocked-out` even though the last punch was
 * a clock-in or a break-start. Someone who forgot to clock out last night is
 * offered "Clock in" this morning and is not stuck at the entrance arguing with
 * a tablet. The abandoned shift is not closed or back-dated — inventing a
 * clock-out time would be inventing payroll data — it is left for the assembler
 * to flag and the manager to correct.
 */
export const deriveStatus = (
  punches: readonly PunchEvent[],
  now: Date,
  openShiftLimitHours: number,
): { state: PunchState; since: Date | null } => {
  const { state, shiftStartedAt, breakStartedAt } = replay(punches);

  if (state === 'clocked-out' || shiftStartedAt === null) {
    return { state: 'clocked-out', since: null };
  }

  const openFor = now.getTime() - shiftStartedAt.getTime();

  if (openFor > openShiftLimitHours * HOUR_MS) {
    return { state: 'clocked-out', since: null };
  }

  // What the screen says they have been doing *since*: the shift's own start
  // while working, the break's start while on one. Not the last punch, which
  // after a break-end would report the wrong thing entirely.
  return { state, since: state === 'on-break' ? breakStartedAt : shiftStartedAt };
};

export const deriveState = (
  punches: readonly PunchEvent[],
  now: Date,
  openShiftLimitHours: number,
): PunchState => deriveStatus(punches, now, openShiftLimitHours).state;

/** The actions the punch screen should render for a state. */
export const nextActions = (state: PunchState): readonly PunchAction[] =>
  NEXT_ACTIONS[state];

/**
 * Rejects an action the current state does not allow.
 *
 * Both the screen and this validator read from the same state, so the UI can
 * never offer something the server would refuse, and the two cannot drift.
 */
export const validateTransition = (
  state: PunchState,
  action: PunchAction,
): void => {
  if (PERMITTED[state].includes(action)) return;

  throw new AppError(StatusCodes.CONFLICT, REFUSALS[state]);
};

/**
 * The punches an action writes.
 *
 * Only the compound action produces more than one, and both share a single
 * timestamp so a break that ends as someone leaves cannot be recorded a
 * millisecond after their clock-out and read back as an unclosed break.
 */
export const punchesForAction = (action: PunchAction): readonly PunchType[] =>
  action === 'break-end-and-clock-out'
    ? ['break-end', 'clock-out']
    : [action];

/** The state a punch leaves behind, or null if it could not have happened. */
const transition = (state: PunchState, type: PunchType): PunchState | null => {
  switch (type) {
    case 'clock-in':
      return state === 'clocked-out' ? 'clocked-in' : null;
    case 'break-start':
      return state === 'clocked-in' ? 'on-break' : null;
    case 'break-end':
      return state === 'on-break' ? 'clocked-in' : null;
    case 'clock-out':
      return state === 'clocked-out' ? null : 'clocked-out';
  }
};

/**
 * Checks that a whole history could actually have happened.
 *
 * Run over the history a manager's correction *would* produce, before it is
 * written. Fixing one shift must not quietly make a neighbouring one
 * unreadable — inserting a clock-in in the middle of an open shift, or a
 * break-end with no break to end.
 *
 * The stale-shift rule applies here exactly as it does live, so a history where
 * someone forgot to clock out and simply started again the next morning stays
 * valid. That is an everyday occurrence, not a contradiction.
 */
export const validateSequence = (
  punches: readonly PunchEvent[],
  openShiftLimitHours: number,
): void => {
  let state: PunchState = 'clocked-out';
  let shiftStartedAt: Date | null = null;

  for (const punch of punches.filter(countsTowardsWork).sort(byTime)) {
    const stale =
      shiftStartedAt !== null &&
      punch.at.getTime() - shiftStartedAt.getTime() > openShiftLimitHours * HOUR_MS;
    const from = stale ? 'clocked-out' : state;
    const next = transition(from, punch.type);

    if (next === null) {
      throw new AppError(
        StatusCodes.CONFLICT,
        `That leaves an impossible sequence — a ${punch.type} with nothing to match it.`,
      );
    }

    state = next;
    if (punch.type === 'clock-in') shiftStartedAt = punch.at;
    if (next === 'clocked-out') shiftStartedAt = null;
  }
};
