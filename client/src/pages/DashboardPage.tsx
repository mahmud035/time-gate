import { useNavigate } from 'react-router';
import { useLogout, useSession } from '@/features/auth/auth.hooks.ts';

/**
 * Batch 1 placeholder. Its only job is to prove a manager session survives a
 * reload on a real device — the today's board, review queue and reports land in
 * Batch 3.
 */
const DashboardPage = () => {
  const navigate = useNavigate();
  const session = useSession();
  const logout = useLogout();

  if (session.isPending) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-sunken" />
        <div className="mt-4 h-32 animate-pulse rounded-lg bg-surface-sunken" />
      </main>
    );
  }

  if (session.isError || !session.data) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <p role="alert" className="text-sm text-danger">
          Your session has ended. Please sign in again.
        </p>
      </main>
    );
  }

  const { user } = session.data;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-content-muted">
            Signed in as {user.name} ({user.role})
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            logout.mutate(undefined, {
              onSettled: () => {
                void navigate('/login', { replace: true });
              },
            });
          }}
          disabled={logout.isPending}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-60"
        >
          {logout.isPending ? 'Signing out…' : 'Sign out'}
        </button>
      </header>

      <section className="mt-8 rounded-lg border border-success/30 bg-success/5 p-4">
        <p className="font-medium text-success">Session is live</p>
        <p className="mt-1 text-sm text-content-muted">
          Reload this page. If it still says you are signed in, the cookie
          survived the proxy and Batch 1&apos;s gate is met.
        </p>
      </section>
    </main>
  );
};

export default DashboardPage;
