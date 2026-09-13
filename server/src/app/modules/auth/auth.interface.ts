import type { Types } from 'mongoose';
import type { UserRole } from '../user/user.interface.js';

export const SESSION_KINDS = ['refresh'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

/**
 * A manager's refresh credential.
 *
 * Staff hold no session of any kind — a 4-digit code both identifies and
 * authenticates them on every punch, so there is nothing to enrol and nothing
 * to revoke. The `kind` discriminator is kept because it costs nothing and
 * makes adding a second credential type a schema change rather than a
 * migration.
 */
export type ISession = {
  _id: Types.ObjectId;

  /** sha256 of the opaque token. The token itself is never stored. */
  tokenHash: string;
  kind: SessionKind;

  userId: Types.ObjectId | null;

  /** Human label for the manager's device list, e.g. "Manager — iOS". */
  label: string;

  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

/** What the access token carries, and what request handlers read off it. */
export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
};
