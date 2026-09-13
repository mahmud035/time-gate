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
   * Keyed hash of the 4-digit code. Both identifies and authenticates a punch.
   *
   * Deliberately an HMAC and not bcrypt, for two reasons that point the same
   * way.
   *
   * Speed: the code has to say *who* this is, and a bcrypt hash cannot be
   * looked up — finding the owner would mean comparing against every employee
   * in turn at roughly a third of a second each, which is ten seconds a punch
   * in a thirty-person workplace. This is one indexed read.
   *
   * Secrecy: four digits is only ten thousand possibilities, so a stolen
   * database of bcrypt hashes gives up every code to about an hour of offline
   * guessing. Storing one would be handing over the codes with extra steps.
   * The pepper keying this HMAC lives in the environment, not the database, so
   * a database dump alone cannot even compute a candidate.
   *
   * What actually stops online guessing is the slug gating the punch page and
   * the failure-only throttle in front of it — never the cost of a hash.
   *
   * Required for employees, who punch with it. Absent for a manager who only
   * runs the dashboard, so the unique index is sparse.
   */
  codeLookup?: string;

  /**
   * "Payroll / works number" — the join key payroll software imports against.
   * Blank until the company supplies it, so the unique index is sparse.
   */
  payrollRef?: string;

  role: UserRole;
  isActive: boolean;

  /**
   * Managers only. There is deliberately no code equivalent: a wrong code
   * matches no row at all, so there is no account to attribute the failure to
   * and nothing a per-account counter could lock.
   */
  failedPasswordAttempts: number;
  passwordLockedUntil: Date | null;

  createdAt: Date;
  updatedAt: Date;
};
