import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';
import type { HydratedDocument, Types } from 'mongoose';
import { config } from '../../../config/index.js';
import {
  clearFailures,
  registerFailure,
  wait,
} from '../../middlewares/codeTarpit.js';
import { AppError } from '../../utils/AppError.js';
import { timesheetService } from '../timesheet/timesheet.service.js';
import { userService, type UserDoc } from '../user/user.service.js';
import type { IPunch, PunchAction, PunchType } from './punch.interface.js';
import { Punch } from './punch.model.js';
import {
  deriveState,
  deriveStatus,
  nextActions,
  punchesForAction,
  validateSequence,
  validateTransition,
} from './punch.logic.js';

const DUPLICATE_KEY = 11000;
const LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

/**
 * Every failure on the staff path says the same thing.
 *
 * An unknown code and a deactivated account must be indistinguishable, or the
 * endpoint becomes a way to discover which codes exist.
 */
const REJECTED = "That code isn't recognised.";

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: number }).code === DUPLICATE_KEY;

/**
 * Every non-voided punch for a person, oldest first.
 *
 * Unbounded on purpose: the state machine has to see the whole history to know
 * whether a shift is still open, and the compound index on
 * `{ userId, voidedAt, at }` makes this the cheapest read in the system.
 */
const historyOf = async (userId: Types.ObjectId | string): Promise<IPunch[]> =>
  Punch.find({ userId, voidedAt: null }).sort({ at: 1 }).lean<IPunch[]>();

type StaffStatus = {
  name: string;
  state: ReturnType<typeof deriveState>;
  /** When the current shift or break began. Null when clocked out. */
  since: Date | null;
  nextActions: readonly PunchAction[];
  weekToDatePayableMs: number;
};

const statusOf = async (user: UserDoc, now: Date): Promise<StaffStatus> => {
  const history = await historyOf(user._id);
  const { state, since } = deriveStatus(
    history,
    now,
    config.OPEN_SHIFT_LIMIT_HOURS,
  );

  return {
    name: user.name,
    state,
    since,
    nextActions: nextActions(state),
    weekToDatePayableMs: await timesheetService.weekToDatePayableMs(
      String(user._id),
      now,
    ),
  };
};

/**
 * Resolves a code to a person, or refuses in a way that reveals nothing.
 *
 * The penalty for a wrong code is paid here rather than by a gate in front,
 * because only this function knows whether the code was right. A correct code
 * is answered at once no matter how many wrong ones preceded it, which is what
 * keeps a mistyping queue — or somebody probing — from closing the door on
 * everyone sharing the tablet's address.
 */
const requireStaff = async (code: string, address: string): Promise<UserDoc> => {
  const user = await userService.findByCode(code);

  if (!user) {
    const { delayMs, blocked } = registerFailure(address);

    await wait(delayMs);

    if (blocked) {
      throw new AppError(
        StatusCodes.TOO_MANY_REQUESTS,
        'Too many incorrect codes from this device. Please ask your manager.',
      );
    }

    throw new AppError(StatusCodes.UNAUTHORIZED, REJECTED);
  }

  clearFailures(address);

  return user;
};

/**
 * Step one at the keypad: who is this, and what can they do right now?
 *
 * Reads nothing into the database. A wrong code gets the same refusal whether
 * the code is unknown, the account is deactivated, or the person left last year.
 */
const lookup = async (
  code: string,
  address: string,
  now = new Date(),
): Promise<StaffStatus> => statusOf(await requireStaff(code, address), now);

/**
 * Step two: write the punch.
 *
 * The code is sent again rather than carried in a session. Staff hold no
 * session at all, so each step authenticates on its own and there is no
 * short-lived token to leak on a shared tablet.
 */
const record = async (input: {
  code: string;
  action: PunchAction;
  idempotencyKey: string;
  address: string;
}): Promise<StaffStatus & { at: Date; replayed: boolean }> => {
  const now = new Date();
  const user = await requireStaff(input.code, input.address);

  const replay = await Punch.findOne({ idempotencyKey: input.idempotencyKey });

  if (replay) {
    // A double tap, a flaky connection, or a retry. The original punch stands
    // and its time is returned unchanged — writing a second one here is exactly
    // the duplicate this key exists to prevent.
    return { ...(await statusOf(user, now)), at: replay.at, replayed: true };
  }

  const history = await historyOf(user._id);
  const state = deriveState(history, now, config.OPEN_SHIFT_LIMIT_HOURS);

  validateTransition(state, input.action);

  const types = punchesForAction(input.action);
  const documents = types.map((type: PunchType, index: number) => ({
    userId: user._id,
    type,
    // One instant for every punch the action produces, so a break that ends as
    // someone leaves cannot be recorded a millisecond after their clock-out and
    // read back as an unclosed break.
    at: now,
    source: 'staff' as const,
    createdBy: user._id,
    // The index is unique, so a compound action cannot reuse the bare key. The
    // first punch carries it, which is what a replay looks for.
    idempotencyKey: index === 0 ? input.idempotencyKey : `${input.idempotencyKey}#${index + 1}`,
  }));

  try {
    await Punch.insertMany(documents, { ordered: true });
  } catch (error) {
    // Two taps landing together: the index rejected the second, which means the
    // first already recorded this punch. That is the correct outcome, not an error.
    if (!isDuplicateKey(error)) throw error;

    return { ...(await statusOf(user, now)), at: now, replayed: true };
  }

  return { ...(await statusOf(user, now)), at: now, replayed: false };
};

/**
 * Reads a manager-entered local time.
 *
 * A time inside the spring-forward gap does not exist, and Luxon resolves it
 * silently forward by an hour. Left alone that would record an hour nobody
 * worked, so the round trip is checked and the entry is refused instead of
 * quietly moved.
 */
const parseLocalTime = (local: string): Date => {
  const parsed = DateTime.fromISO(local, { zone: config.TIMEZONE });

  if (!parsed.isValid) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'That is not a valid date and time');
  }

  if (parsed.toFormat(LOCAL_FORMAT) !== local) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'That time does not exist — the clocks went forward. Pick a time before or after the change.',
    );
  }

  return parsed.toJSDate();
};

const withoutPunch = (history: IPunch[], id: string): IPunch[] =>
  history.filter((punch) => String(punch._id) !== id);

const sortedByTime = (history: IPunch[]): IPunch[] =>
  [...history].sort((a, b) => a.at.getTime() - b.at.getTime());

/** Inserts the punch a staff member never made — the forgotten clock-out. */
const managerCreate = async (input: {
  userId: string;
  type: PunchType;
  local: string;
  managerId: string;
}): Promise<IPunch> => {
  const at = parseLocalTime(input.local);
  const history = await historyOf(input.userId);

  validateSequence(
    sortedByTime([...history, { type: input.type, at } as IPunch]),
    config.OPEN_SHIFT_LIMIT_HOURS,
  );

  const created = await Punch.create({
    userId: input.userId,
    type: input.type,
    at,
    source: 'manager',
    createdBy: input.managerId,
  });

  return created.toObject();
};

/** Corrects a time that was recorded wrongly. */
const managerAmend = async (input: {
  punchId: string;
  local: string;
}): Promise<IPunch> => {
  const punch: HydratedDocument<IPunch> | null = await Punch.findById(input.punchId);

  if (!punch || punch.voidedAt) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No such punch');
  }

  const at = parseLocalTime(input.local);
  const history = await historyOf(punch.userId);

  validateSequence(
    sortedByTime([
      ...withoutPunch(history, input.punchId),
      { ...punch.toObject(), at },
    ]),
    config.OPEN_SHIFT_LIMIT_HOURS,
  );

  punch.at = at;
  await punch.save();

  return punch.toObject();
};

/** Soft-deletes a duplicate. Nothing is removed; assembly simply stops counting it. */
const managerVoid = async (punchId: string): Promise<void> => {
  const punch = await Punch.findById(punchId);

  if (!punch || punch.voidedAt) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No such punch');
  }

  const history = await historyOf(punch.userId);

  validateSequence(withoutPunch(history, punchId), config.OPEN_SHIFT_LIMIT_HOURS);

  punch.voidedAt = new Date();
  await punch.save();
};

export const punchService = {
  lookup,
  record,
  managerCreate,
  managerAmend,
  managerVoid,
  parseLocalTime,
};
