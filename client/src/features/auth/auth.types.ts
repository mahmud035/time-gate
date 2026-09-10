/** Mirrors the backend `PublicUser` exactly. A drift here breaks the build. */
export type PublicUser = {
  id: string;
  name: string;
  email: string | null;
  payrollRef: string | null;
  role: 'employee' | 'manager';
  isActive: boolean;
  phonePunchEnabled: boolean;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type SessionPayload = {
  user: PublicUser;
};
