import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { getApiErrorMessage } from '@/api/axios.ts';
import { DashboardShell } from '@/components/layout/DashboardShell.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { EmptyState } from '@/components/ui/EmptyState.tsx';
import { TableSkeleton } from '@/components/ui/Skeleton.tsx';
import { ShiftStatusBadge } from '@/components/ui/StatusBadge.tsx';
import {
  CorrectionDialog,
  type Correction,
} from '@/features/timesheet/components/CorrectionDialog.tsx';
import { timesheetApi } from '@/features/timesheet/timesheet.api.ts';
import { useTimesheet } from '@/features/timesheet/timesheet.hooks.ts';
import type { TimesheetRow } from '@/features/timesheet/timesheet.types.ts';
import { formatDuration, formatHoursMinutes } from '@/utils/duration.ts';
import {
  addDays,
  isoToShortDate,
  londonTime,
  londonWeekStart,
} from '@/utils/time.ts';

const timeOf = (value: string | null): string => (value ? londonTime(value) : '');

const ANOMALY_COPY: Record<string, string> = {
  'missing-clock-out': 'No clock-out',
  'unclosed-break': 'Break never ended',
  'exceeds-limit': 'Still open',
};

const RecordsPage = () => {
  const [weekStart, setWeekStart] = useState(() => londonWeekStart());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const from = weekStart;
  const to = addDays(weekStart, 7);
  const timesheet = useTimesheet(from, to);
  const rows = timesheet.data?.rows ?? [];

  const shiftWeek = (days: number) => {
    setWeekStart(addDays(weekStart, days));
    setExpanded(null);
  };

  /** What a manager most likely wants to fix, per anomaly. */
  const fixFor = (row: TimesheetRow): Correction => {
    if (row.clockOut === null) {
      return {
        kind: 'add',
        row,
        type: 'clock-out',
        label: 'Add the missing clock-out',
      };
    }

    const openBreak = row.breaks.find((entry) => entry.end === null);

    if (openBreak) {
      return { kind: 'add', row, type: 'break-end', label: 'Add the missing break end' };
    }

    return {
      kind: 'amend',
      row,
      punchId: row.clockOutId ?? '',
      at: row.clockOut,
      label: 'Change the clock-out time',
    };
  };

  const download = () => {
    setExportError(null);
    timesheetApi.exportCsv(from, to).catch((error: unknown) => {
      setExportError(getApiErrorMessage(error, 'Could not download the CSV'));
    });
  };

  return (
    <DashboardShell
      title="Records"
      subtitle={`${isoToShortDate(from)} — ${isoToShortDate(addDays(from, 6))}`}
      actions={
        <>
          <div className="flex items-center overflow-hidden rounded-lg border border-border bg-surface-raised">
            <button
              type="button"
              onClick={() => shiftWeek(-7)}
              aria-label="Previous week"
              className="border-r border-border px-2.5 py-2.5 text-content-muted hover:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(londonWeekStart())}
              className="px-3.5 py-2.5 text-sm font-medium hover:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(7)}
              aria-label="Next week"
              className="border-l border-border px-2.5 py-2.5 text-content-muted hover:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <Button variant="primary" onClick={download} disabled={rows.length === 0}>
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </Button>
        </>
      }
    >
      {(timesheet.isError || exportError) && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          {exportError ?? getApiErrorMessage(timesheet.error, 'Could not load records')}
        </p>
      )}

      {timesheet.isPending && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
          <TableSkeleton rows={6} />
        </div>
      )}

      {timesheet.isSuccess && (
        <>
          {timesheet.data.needsReview > 0 && (
            <div className="mb-4 flex gap-3 rounded-xl border border-warning/40 bg-warning/8 p-4">
              <TriangleAlert
                className="mt-0.5 size-5 flex-shrink-0 text-warning"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold">
                  {timesheet.data.needsReview} shift
                  {timesheet.data.needsReview === 1 ? '' : 's'} need a look before you
                  export
                </p>
                <p className="mt-1 text-sm text-content-muted">
                  They are still in the CSV, with their real times and zero hours, so
                  nobody is paid short without it showing.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface-raised px-5 py-4">
              <div className="text-xs font-semibold tracking-[0.07em] text-content-muted uppercase">
                Payable this week
              </div>
              <div className="tabular mt-1.5 text-3xl font-semibold tracking-tight">
                {formatHoursMinutes(timesheet.data.totalPayableMs)}
              </div>
              <div className="mt-1 text-xs text-content-muted">
                {(timesheet.data.totalPayableMs / 3_600_000).toFixed(2)} hours
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface-raised px-5 py-4">
              <div className="text-xs font-semibold tracking-[0.07em] text-content-muted uppercase">
                Unpaid breaks
              </div>
              <div className="tabular mt-1.5 text-3xl font-semibold tracking-tight">
                {formatHoursMinutes(rows.reduce((total, row) => total + row.breakMs, 0))}
              </div>
              <div className="mt-1 text-xs text-content-muted">Deducted from payable</div>
            </div>
            <div className="rounded-xl border border-border bg-surface-raised px-5 py-4">
              <div className="text-xs font-semibold tracking-[0.07em] text-content-muted uppercase">
                Shifts
              </div>
              <div className="tabular mt-1.5 text-3xl font-semibold tracking-tight">
                {rows.length}
              </div>
              <div className="mt-1 text-xs text-content-muted">
                {timesheet.data.needsReview} need review
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface-raised">
            {rows.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No shifts this week"
                hint="Shifts appear here as staff clock in and out. Use the arrows above to look at another week."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] border-collapse text-sm">
                  <thead>
                    <tr className="text-xs tracking-[0.07em] text-content-muted uppercase">
                      <th className="w-10 px-2 py-3" />
                      <th className="px-4 py-3 text-left font-semibold">Staff</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">In</th>
                      <th className="px-4 py-3 text-left font-semibold">Out</th>
                      <th className="px-4 py-3 text-right font-semibold">Break</th>
                      <th className="px-4 py-3 text-right font-semibold">Payable</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const key = `${row.userId}-${row.clockIn}`;
                      const isOpen = expanded === key;
                      const flagged = row.status === 'needs-review';

                      return (
                        <tr
                          key={key}
                          className={`border-t border-border ${flagged ? 'bg-warning/5' : ''}`}
                        >
                          <td className="px-2 py-3.5 text-center">
                            {row.breaks.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpanded(isOpen ? null : key)}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? 'Hide' : 'Show'} break times for ${row.name} on ${isoToShortDate(row.date)}`}
                                className="-my-2 rounded p-2.5 text-content-muted hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
                              >
                                <ChevronDown
                                  className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                  aria-hidden="true"
                                />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-medium">{row.name}</td>
                          <td className="px-4 py-3.5 text-content-muted">
                            {isoToShortDate(row.date)}
                          </td>
                          <td className="tabular px-4 py-3.5">{timeOf(row.clockIn)}</td>
                          <td className="tabular px-4 py-3.5">
                            {row.clockOut ? (
                              timeOf(row.clockOut)
                            ) : (
                              <span className="text-content-muted">— missing —</span>
                            )}
                          </td>
                          <td className="tabular px-4 py-3.5 text-right text-content-muted">
                            {row.breakMs > 0 ? formatDuration(row.breakMs) : '—'}
                          </td>
                          <td
                            className={`tabular px-4 py-3.5 text-right font-semibold ${flagged ? 'text-content-muted' : ''}`}
                          >
                            {formatHoursMinutes(row.payableMs)}
                          </td>
                          <td className="px-4 py-3.5">
                            <ShiftStatusBadge status={row.status} />
                            {row.anomalies.length > 0 && (
                              <span className="mt-1 block text-xs text-content-muted">
                                {row.anomalies
                                  .map((code) => ANOMALY_COPY[code] ?? code)
                                  .join(' · ')}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setCorrection(fixFor(row))}
                              className="-my-3 rounded px-1.5 py-3 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            >
                              {flagged ? 'Fix' : 'Edit'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Individual break times live on screen only. The CSV stays one row
              per shift, which is what keeps it checkable by hand. */}
          {expanded !== null &&
            rows
              .filter((row) => `${row.userId}-${row.clockIn}` === expanded)
              .map((row) => (
                <div
                  key={expanded}
                  className="mt-3 rounded-xl border border-border bg-surface-sunken px-5 py-4"
                >
                  <div className="text-xs font-semibold tracking-[0.07em] text-content-muted uppercase">
                    {row.name} · breaks on {isoToShortDate(row.date)}
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                    {row.breaks.map((entry, index) => (
                      <li key={entry.startId ?? index} className="flex items-center gap-2.5">
                        <span className="text-xs font-semibold text-content-muted uppercase">
                          Break {index + 1}
                        </span>
                        <span className="tabular">
                          {timeOf(entry.start)} —{' '}
                          {entry.end ? (
                            timeOf(entry.end)
                          ) : (
                            <span className="text-warning">never ended</span>
                          )}
                        </span>
                        <span className="text-content-muted">
                          {entry.end ? formatDuration(entry.ms) : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
        </>
      )}

      <CorrectionDialog correction={correction} onClose={() => setCorrection(null)} />
    </DashboardShell>
  );
};

export default RecordsPage;
