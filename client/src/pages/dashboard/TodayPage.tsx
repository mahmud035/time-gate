import { Users } from 'lucide-react';
import { getApiErrorMessage } from '@/api/axios.ts';
import { DashboardShell } from '@/components/layout/DashboardShell.tsx';
import { EmptyState } from '@/components/ui/EmptyState.tsx';
import { TableSkeleton } from '@/components/ui/Skeleton.tsx';
import { StateBadge } from '@/components/ui/StatusBadge.tsx';
import { useToday } from '@/features/timesheet/timesheet.hooks.ts';
import type { TodayEntry } from '@/features/timesheet/timesheet.types.ts';
import { formatDuration } from '@/utils/duration.ts';
import { londonLongDate, londonTime } from '@/utils/time.ts';

const timeOf = (iso: string | null): string => (iso ? londonTime(iso) : '—');

const Count = ({ label, value, muted }: { label: string; value: number; muted?: boolean }) => (
  <div className="rounded-xl border border-border bg-surface-raised px-5 py-4">
    <div className="text-xs font-semibold tracking-[0.07em] text-content-muted uppercase">
      {label}
    </div>
    <div
      className={`tabular mt-1.5 text-3xl font-semibold tracking-tight ${muted ? 'text-content-muted' : ''}`}
    >
      {value}
    </div>
  </div>
);

const TodayPage = () => {
  const today = useToday();
  const staff = today.data ?? [];

  const count = (state: TodayEntry['state']) =>
    staff.filter((entry) => entry.state === state).length;

  return (
    <DashboardShell
      title="Today"
      subtitle={londonLongDate(new Date())}
    >
      {today.isError && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          {getApiErrorMessage(today.error, 'Could not load today')}
        </p>
      )}

      {today.isPending && (
        <div className="grid gap-3 sm:grid-cols-3">
          <TableSkeleton rows={1} />
          <TableSkeleton rows={1} />
          <TableSkeleton rows={1} />
        </div>
      )}

      {today.isSuccess && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Count label="On shift" value={count('clocked-in')} />
            <Count label="On a break" value={count('on-break')} />
            <Count label="Not in" value={count('clocked-out')} muted />
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface-raised">
            <h2 className="border-b border-border px-5 py-4 text-sm font-semibold">
              Who&rsquo;s here
            </h2>

            {staff.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No staff yet"
                hint="Add your team on the Staff page. Each person gets a 4-digit code to clock in with."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] border-collapse text-sm">
                  <thead>
                    <tr className="text-xs tracking-[0.07em] text-content-muted uppercase">
                      <th className="px-5 py-3 text-left font-semibold">Staff</th>
                      <th className="px-5 py-3 text-left font-semibold">Status</th>
                      <th className="px-5 py-3 text-left font-semibold">Since</th>
                      <th className="px-5 py-3 text-right font-semibold">Today so far</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((entry) => (
                      <tr key={entry.userId} className="border-t border-border">
                        <td className="px-5 py-3.5 font-medium">{entry.name}</td>
                        <td className="px-5 py-3.5">
                          <StateBadge state={entry.state} />
                        </td>
                        <td className="tabular px-5 py-3.5 text-content-muted">
                          {timeOf(entry.since)}
                        </td>
                        <td className="tabular px-5 py-3.5 text-right">
                          {entry.todayPayableMs > 0
                            ? formatDuration(entry.todayPayableMs)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-content-muted">
            Hours count finished shifts only, with breaks already deducted, so a shift
            in progress shows a dash.
          </p>
        </>
      )}
    </DashboardShell>
  );
};

export default TodayPage;
