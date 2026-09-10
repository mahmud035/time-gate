import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSession } from '@/features/auth/auth.hooks.ts';

/**
 * Gates manager routes on a live session.
 *
 * The check is a convenience, not the security boundary — every protected
 * endpoint enforces auth server-side. Hiding a route in the browser protects
 * nothing on its own.
 */
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const session = useSession();

  if (session.isPending) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-sunken" />
        <div className="mt-4 h-32 animate-pulse rounded-lg bg-surface-sunken" />
      </div>
    );
  }

  if (session.isError || !session.data) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
