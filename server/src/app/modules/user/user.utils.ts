import type { IUser, UserRole } from './user.interface.js';

/**
 * The only user shape that ever leaves the API. Hashes and lockout counters are
 * absent by construction, not by remembering to strip them.
 */
export type PublicUser = {
  id: string;
  name: string;
  email: string | null;
  payrollRef: string | null;
  role: UserRole;
  isActive: boolean;
};

/** Maps a stored user onto the public shape the frontend types mirror. */
export const toPublicUser = (user: IUser): PublicUser => ({
  id: String(user._id),
  name: user.name,
  email: user.email ?? null,
  payrollRef: user.payrollRef ?? null,
  role: user.role,
  isActive: user.isActive,
});
