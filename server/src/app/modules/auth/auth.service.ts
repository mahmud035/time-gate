import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import { config } from '../../../config/index.js';
import { AppError } from '../../utils/AppError.js';
import { parseDuration } from '../../utils/duration.js';
import {
  createOpaqueToken,
  hashToken,
  signAccessToken,
} from '../../utils/tokens.js';
import type { IUser } from '../user/user.interface.js';
import { User } from '../user/user.model.js';
import { toPublicUser, type PublicUser } from '../user/user.utils.js';
import { Session } from './session.model.js';

const MAX_PASSWORD_ATTEMPTS = 5;
const PASSWORD_LOCK_MS = 5 * 60 * 1000;

/**
 * A real bcrypt hash to compare against when no account matched, so a wrong
 * email and a wrong password take the same time and cannot be told apart.
 * Computed once at boot.
 */
const TIMING_DECOY_HASH = bcrypt.hashSync(
  'timing-decoy',
  config.BCRYPT_ROUNDS,
);

export type IssuedSession = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

/**
 * Mints an access token and a fresh opaque refresh token, recording only the
 * refresh token's hash. Lockouts and revocation are account-keyed, never keyed
 * on the client IP — two proxies sit in front of this server and a forwarded
 * header is attacker-controlled.
 */
const issueSession = async (
  user: Pick<IUser, '_id' | 'role'>,
  label: string,
): Promise<IssuedSession> => {
  const refreshToken = createOpaqueToken();
  const refreshExpiresAt = new Date(
    Date.now() + parseDuration(config.REFRESH_TOKEN_TTL),
  );

  await Session.create({
    tokenHash: hashToken(refreshToken),
    kind: 'refresh',
    userId: user._id,
    label,
    lastUsedAt: new Date(),
    expiresAt: refreshExpiresAt,
    createdBy: user._id,
  });

  return {
    accessToken: signAccessToken({ sub: String(user._id), role: user.role }),
    refreshToken,
    refreshExpiresAt,
  };
};

/**
 * Signs a manager in with email and password.
 *
 * Employees have no password and never reach this path — they identify
 * themselves with a 4-digit code on the shared punch page.
 */
const login = async (
  email: string,
  password: string,
  label: string,
): Promise<IssuedSession & { user: PublicUser }> => {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash',
  );

  const invalidCredentials = new AppError(
    StatusCodes.UNAUTHORIZED,
    'Invalid email or password',
  );

  if (!user?.passwordHash || user.role !== 'manager') {
    await bcrypt.compare(password, TIMING_DECOY_HASH);
    throw invalidCredentials;
  }

  if (!user.isActive) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'This account has been deactivated',
    );
  }

  const now = new Date();

  if (user.passwordLockedUntil && user.passwordLockedUntil > now) {
    const minutes = Math.ceil(
      (user.passwordLockedUntil.getTime() - now.getTime()) / 60_000,
    );

    throw new AppError(
      StatusCodes.LOCKED,
      `Too many failed attempts. Try again in ${String(minutes)} minute${
        minutes === 1 ? '' : 's'
      }.`,
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    const attempts = user.failedPasswordAttempts + 1;
    const shouldLock = attempts >= MAX_PASSWORD_ATTEMPTS;

    await User.updateOne(
      { _id: user._id },
      shouldLock
        ? {
            failedPasswordAttempts: 0,
            passwordLockedUntil: new Date(now.getTime() + PASSWORD_LOCK_MS),
          }
        : { failedPasswordAttempts: attempts },
    );

    throw invalidCredentials;
  }

  await User.updateOne(
    { _id: user._id },
    { failedPasswordAttempts: 0, passwordLockedUntil: null },
  );

  const issued = await issueSession(user, label);

  return { ...issued, user: toPublicUser(user) };
};

/**
 * Exchanges a refresh token for a new pair, revoking the one presented.
 *
 * A token that is presented after it was already rotated has leaked, so every
 * refresh session for that user is revoked and they must sign in again.
 */
const refresh = async (
  rawToken: string,
  label: string,
): Promise<IssuedSession & { user: PublicUser }> => {
  const session = await Session.findOne({
    tokenHash: hashToken(rawToken),
    kind: 'refresh',
  });

  const invalidSession = new AppError(
    StatusCodes.UNAUTHORIZED,
    'Your session has expired. Please sign in again.',
  );

  if (!session) {
    throw invalidSession;
  }

  if (session.revokedAt) {
    if (session.userId) {
      await Session.updateMany(
        { userId: session.userId, kind: 'refresh', revokedAt: null },
        { revokedAt: new Date() },
      );
    }

    throw invalidSession;
  }

  if (session.expiresAt && session.expiresAt <= new Date()) {
    throw invalidSession;
  }

  const user = await User.findById(session.userId);

  if (!user?.isActive) {
    throw invalidSession;
  }

  session.revokedAt = new Date();
  await session.save();

  const issued = await issueSession(user, label);

  return { ...issued, user: toPublicUser(user) };
};

/**
 * Revokes the presented refresh session. Deliberately silent when the token is
 * unknown — signing out should never fail, and never confirm what exists.
 */
const logout = async (rawToken: string | undefined): Promise<void> => {
  if (!rawToken) {
    return;
  }

  await Session.updateOne(
    { tokenHash: hashToken(rawToken), kind: 'refresh', revokedAt: null },
    { revokedAt: new Date() },
  );
};

/** Returns the signed-in user, or 401 if the account has since been disabled. */
const getCurrentUser = async (userId: string): Promise<PublicUser> => {
  const user = await User.findById(userId);

  if (!user?.isActive) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not signed in');
  }

  return toPublicUser(user);
};

export const authService = {
  login,
  refresh,
  logout,
  getCurrentUser,
};
