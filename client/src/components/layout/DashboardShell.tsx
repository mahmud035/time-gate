import { CalendarClock, Clock, FileText, LogOut, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useLogout, useSession } from '@/features/auth/auth.hooks.ts';

const NAV = [
  { to: '/dashboard', label: 'Today', icon: CalendarClock, end: true },
  { to: '/dashboard/records', label: 'Records', icon: FileText, end: false },
  { to: '/dashboard/staff', label: 'Staff', icon: Users, end: false },
] as const;

const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const DashboardShell = ({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) => {
  const session = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const name = session.data?.user.name ?? '';

  const signOut = () => {
    logout.mutate(undefined, {
      onSettled: () => void navigate('/login', { replace: true }),
    });
  };

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Below `lg` this becomes a top bar: a manager checking the floor from a
          phone should not be navigating around a sidebar meant for a desktop. */}
      <nav className="flex flex-shrink-0 flex-col border-b border-border bg-surface-raised px-3 py-3 lg:w-58 lg:border-r lg:border-b-0 lg:px-3.5 lg:py-5">
        <div className="mb-0 flex items-center justify-between gap-2 px-2.5 lg:mb-6 lg:justify-start">
          <div className="flex items-center gap-2.5">
            <Clock className="size-5 text-brand" aria-hidden="true" />
            <span className="font-semibold tracking-tight">TimeGate</span>
          </div>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="-m-1.5 rounded-lg p-3 text-content-muted hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:hidden"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-2 flex gap-1 overflow-x-auto lg:mt-0 lg:flex-col lg:overflow-visible">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-content-muted hover:bg-surface-sunken hover:text-content'
                }`
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="hidden flex-grow lg:block" />

        <div className="hidden items-center gap-2.5 border-t border-border px-2.5 pt-3.5 lg:flex">
          <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
            {initialsOf(name)}
          </span>
          <span className="min-w-0 flex-grow">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block text-xs text-content-muted">Manager</span>
          </span>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="-m-1.5 rounded-lg p-3 text-content-muted hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </nav>

      <main className="min-w-0 flex-grow px-5 py-6 lg:px-8 lg:py-7">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-content-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>

        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
};
