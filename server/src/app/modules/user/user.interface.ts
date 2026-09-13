import type { Types } from 'mongoose';

export const USER_ROLES = ['employee', 'manager'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * One record per person, employee or manager.
 *
 * Only managers have an email and a password — employees never log in. An
 * employee's 4-digit code both identifies and authenticates them on the shared
 * punch page, so the code is the whole of their credential.
 */
export type IUser = {
  _id: Types.ObjectId;
  name: string;

  /** Managers only. Absent for employees, so the unique index is sparse. */
  email?: string;
  /** Managers only. Never selected by default. */
  passwordHash?: string;

  /**
   * 4-digit PIN, bcrypt hashed. Never selected by default.
   *
   * Required for employees, who punch with it. Optional for a manager who only
   * runs the dashboard and never clocks in — the model enforces exactly that.
   */
  pinHash?: string;

  /**
   * "Payroll / works number" — the join key payroll software imports against.
   * Blank until the company supplies it, so the unique index is sparse.
   */
  payrollRef?: string;

  role: UserRole;
  isActive: boolean;

  failedPinAttempts: number;
  pinLockedUntil: Date | null;
  failedPasswordAttempts: number;
  passwordLockedUntil: Date | null;

  createdAt: Date;
  updatedAt: Date;
};
