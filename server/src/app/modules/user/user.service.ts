import { StatusCodes } from 'http-status-codes';
import type { HydratedDocument } from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { codeLookupOf, generateCode } from './user.code.js';
import type { IUser } from './user.interface.js';
import { User } from './user.model.js';
import { toPublicUser, type PublicUser } from './user.utils.js';

/**
 * A collision is a wasted attempt, not a failure. With four digits and a
 * workplace of tens rather than thousands, the odds of needing even a second
 * attempt are small; this only exists so that a clash cannot surface as a
 * database error in front of a manager.
 */
const CODE_ATTEMPTS = 10;
const DUPLICATE_KEY = 11000;

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: number }).code === DUPLICATE_KEY;

type UserDoc = HydratedDocument<IUser>;

const findOrFail = async (id: string): Promise<UserDoc> => {
  const user = await User.findById(id);

  if (!user) throw new AppError(StatusCodes.NOT_FOUND, 'No such staff member');

  return user;
};

/**
 * Issues a fresh code, retrying only if the generated one is already taken.
 *
 * The plain code is returned exactly once and never stored — only its keyed
 * hash is. If a manager loses it before passing it on, the code cannot be
 * recovered and has to be reissued, which is the correct trade: a code that
 * could be read back out of the system is one that a database dump gives away.
 */
const issueCode = async (user: UserDoc): Promise<string> => {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = generateCode();

    try {
      await User.updateOne(
        { _id: user._id },
        { $set: { codeLookup: codeLookupOf(code) } },
        { runValidators: true },
      );

      return code;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }

  throw new AppError(
    StatusCodes.CONFLICT,
    'Could not allocate an unused code. Please try again.',
  );
};

/** Everyone the manager can see, newest last so the list reads chronologically. */
const listUsers = async (): Promise<PublicUser[]> => {
  const users = await User.find().sort({ name: 1 });

  return users.map(toPublicUser);
};

/**
 * Adds a staff member and issues their first code.
 *
 * The code comes back in this one response so the manager can pass it on. It is
 * never returned again.
 */
const createStaff = async (input: {
  name: string;
  payrollRef?: string;
}): Promise<{ user: PublicUser; code: string }> => {
  const code = generateCode();

  const created = await User.create({
    name: input.name,
    ...(input.payrollRef ? { payrollRef: input.payrollRef } : {}),
    role: 'employee',
    isActive: true,
    codeLookup: codeLookupOf(code),
  });

  return { user: toPublicUser(created), code };
};

const updateUser = async (
  id: string,
  changes: { name?: string; payrollRef?: string | null; isActive?: boolean },
): Promise<PublicUser> => {
  const user = await findOrFail(id);

  if (changes.name !== undefined) user.name = changes.name;
  if (changes.isActive !== undefined) user.isActive = changes.isActive;
  if (changes.payrollRef !== undefined) {
    // Cleared rather than set to an empty string, so the sparse unique index
    // keeps ignoring it instead of colliding on "".
    if (changes.payrollRef) user.payrollRef = changes.payrollRef;
    else user.set('payrollRef', undefined);
  }

  await user.save();

  return toPublicUser(user);
};

/** Replaces a lost or shared code. The previous one stops working immediately. */
const resetCode = async (id: string): Promise<{ user: PublicUser; code: string }> => {
  const user = await findOrFail(id);

  if (user.role !== 'employee') {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Only staff members clock in, so only they have a code',
    );
  }

  const code = await issueCode(user);

  return { user: toPublicUser(user), code };
};

/**
 * Finds whose code this is, in one indexed read.
 *
 * Returns null rather than throwing for an unknown code: the caller turns every
 * failure into the same generic response, so the endpoint cannot be used to
 * discover which codes exist.
 */
const findByCode = async (code: string): Promise<UserDoc | null> => {
  const user = await User.findOne({
    codeLookup: codeLookupOf(code),
    isActive: true,
  }).select('+codeLookup');

  return user;
};

export const userService = {
  listUsers,
  createStaff,
  updateUser,
  resetCode,
  findByCode,
};

export type { UserDoc };
