import type { Types } from 'mongoose';

export const PUNCH_TYPES = [
  'clock-in',
  'break-start',
  'break-end',
  'clock-out',
] as const;
export type PunchType = (typeof PUNCH_TYPES)[number];

export const PUNCH_SOURCES = ['kiosk', 'phone', 'manager'] as const;
export type PunchSource = (typeof PUNCH_SOURCES)[number];

/**
 * A single clock event. Punches are the only stored fact — shifts and hours are
 * derived from them at read time, so there is never a second source of truth to
 * keep in sync.
 *
 * `at` is server-authoritative for kiosk and phone punches. Only a manager
 * correction (`source: 'manager'`) supplies its own timestamp, and that is the
 * entire point of a correction.
 */
export type IPunch = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: PunchType;
  at: Date;

  /** Derived from the device session kind. Never accepted from the client. */
  source: PunchSource;
  deviceSessionId: Types.ObjectId | null;

  /** Client-generated per tap. Makes a retried request a no-op, not a duplicate. */
  idempotencyKey?: string;

  /** The employee themselves, or the manager who inserted the punch. */
  createdBy: Types.ObjectId;

  /** Soft delete. Shift assembly ignores voided punches; nothing is ever removed. */
  voidedAt: Date | null;
  voidedBy: Types.ObjectId | null;
  voidReason: string | null;

  createdAt: Date;
  updatedAt: Date;
};

export const ADJUSTMENT_ACTIONS = ['create', 'amend', 'void'] as const;
export type AdjustmentAction = (typeof ADJUSTMENT_ACTIONS)[number];

/** The before/after of a corrected punch. Only the fields a manager can change. */
export type AdjustmentSnapshot = {
  at?: Date;
  type?: PunchType;
};

/**
 * Append-only audit log. Written in the same transaction as the punch change it
 * describes, never updated and never deleted — this is what makes a corrected
 * timesheet defensible if an employee disputes a week.
 */
export type IAdjustment = {
  _id: Types.ObjectId;
  punchId: Types.ObjectId;
  action: AdjustmentAction;
  before: AdjustmentSnapshot | null;
  after: AdjustmentSnapshot | null;
  reason: string;
  by: Types.ObjectId;
  at: Date;
};
