/** Mirrors the backend `PublicUser`. A drift here breaks the build. */
export type PublicUser = {
  id: string;
  name: string;
  email: string | null;
  payrollRef: string | null;
  role: 'employee' | 'manager';
  isActive: boolean;
};

/**
 * A newly issued code comes back exactly once.
 *
 * Only a keyed hash is stored, so there is no second chance to read it — losing
 * it means issuing a new one.
 */
export type IssuedCode = { user: PublicUser; code: string };
