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

const byTime = (a: PunchEvent, b: PunchEvent): number =>
  a.at.getTime() - b.at.getTime();

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
): { state: PunchState; shiftStartedAt: Date | null } => {
  let state: PunchState = 'clocked-out';
  let shiftStartedAt: Date | null = null;

  for (const punch of punches.filter(countsTowardsWork).sort(byTime)) {
    switch (punch.type) {
      case 'clock-in':
        state = 'clocked-in';
        shiftStartedAt = punch.at;
        break;
      case 'break-start':
        if (state === 'clocked-in') state = 'on-break';
        break;
      case 'break-end':
        if (state === 'on-break') state = 'clocked-in';
        break;
      case 'clock-out':
        if (state !== 'clocked-out') {
          state = 'clocked-out';
          shiftStartedAt = null;
        }
        break;
    }
  }

  return { state, shiftStartedAt };
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
export const deriveState = (
  punches: readonly PunchEvent[],
  now: Date,
  openShiftLimitHours: number,
): PunchState => {
  const { state, shiftStartedAt } = replay(punches);

  if (state === 'clocked-out' || shiftStartedAt === null) return 'clocked-out';

  const openFor = now.getTime() - shiftStartedAt.getTime();

  return openFor > openShiftLimitHours * HOUR_MS ? 'clocked-out' : state;
};

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
 * timestamp and idempotency key so a retry can never half-apply it.
 */
export const punchesForAction = (action: PunchAction): readonly PunchType[] =>
  action === 'break-end-and-clock-out'
    ? ['break-end', 'clock-out']
    : [action];
