import type { Types } from 'mongoose';
import type { UserRole } from '../user/user.interface.js';

export const SESSION_KINDS = ['refresh', 'kiosk', 'phone'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

/**
 * Every long-lived credential this system issues, in one collection with one
 * revoke path: a manager's refresh token, a kiosk tablet, and an employee's
 * linked phone.
 *
 * Keeping them together is what makes offboarding a single operation —
 * deactivating a leaver revokes their sessions of every kind at once.
 */
export type ISession = {
  _id: Types.ObjectId;

  /** sha256 of the opaque token. The token itself is never stored. */
  tokenHash: string;
  kind: SessionKind;

  /** Null for a kiosk — a tablet belongs to the site, not to a person. */
  userId: Types.ObjectId | null;

  /** Human label for the manager's device list, e.g. "Front entrance tablet". */
  label: string;

  lastUsedAt: Date | null;
  /** Null for kiosk and phone sessions, which expire only by revocation. */
  expiresAt: Date | null;
  revokedAt: Date | null;

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * One-time code a manager issues to link an employee's phone.
 *
 * Typed by the employee rather than opened from a link, because iOS home-screen
 * web apps keep cookies and storage separate from Safari — a link tapped in
 * Safari would enrol the wrong container.
 */
export type ILinkCode = {
  _id: Types.ObjectId;
  codeHash: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  usedAt: Date | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
};

/** What the access token carries, and what request handlers read off it. */
export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
};
