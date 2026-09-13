import type { Types } from 'mongoose';

export const PUNCH_TYPES = [
  'clock-in',
  'break-start',
  'break-end',
  'clock-out',
] as const;
export type PunchType = (typeof PUNCH_TYPES)[number];

export const PUNCH_SOURCES = ['staff', 'manager'] as const;
export type PunchSource = (typeof PUNCH_SOURCES)[number];

/** What a person can be doing right now, derived from their punch history. */
export const PUNCH_STATES = ['clocked-out', 'clocked-in', 'on-break'] as const;
export type PunchState = (typeof PUNCH_STATES)[number];

/**
 * What a person can ask to do. Every punch type, plus one compound action.
 *
 * `break-end-and-clock-out` exists because staff hold no session: each action
 * costs a fresh code entry, so ending a break and leaving would otherwise mean
 * typing the code twice. It writes two real punches at the same instant — the
 * break genuinely did end when they left — which is also what keeps the shift
 * out of the manager's review queue.
 */
export const PUNCH_ACTIONS = [
  'clock-in',
  'break-start',
  'break-end',
  'clock-out',
  'break-end-and-clock-out',
] as const;
export type PunchAction = (typeof PUNCH_ACTIONS)[number];

/**
 * A single clock event. Punches are the only stored fact — shifts and hours are
 * derived from them at read time, so there is never a second source of truth to
 * keep in sync.
 *
 * `at` is server-authoritative for staff punches. Only a manager correction
 * (`source: 'manager'`) supplies its own timestamp, and that is the entire point
 * of a correction.
 */
export type IPunch = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: PunchType;
  at: Date;

  /** Derived from which endpoint wrote the punch. Never accepted from the client. */
  source: PunchSource;

  /** Client-generated per tap. Makes a retried request a no-op, not a duplicate. */
  idempotencyKey?: string;

  /** The staff member themselves, or the manager who inserted the punch. */
  createdBy: Types.ObjectId;

  /** Soft delete. Shift assembly ignores voided punches; nothing is ever removed. */
  voidedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
};
