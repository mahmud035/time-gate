import { KeyRound, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { getApiErrorMessage } from '@/api/axios.ts';
import { DashboardShell } from '@/components/layout/DashboardShell.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Dialog } from '@/components/ui/Dialog.tsx';
import { EmptyState } from '@/components/ui/EmptyState.tsx';
import { TableSkeleton } from '@/components/ui/Skeleton.tsx';
import {
  useCreateStaff,
  useResetCode,
  useStaff,
  useUpdateStaff,
} from '@/features/user/user.hooks.ts';
import type { IssuedCode } from '@/features/user/user.types.ts';

const StaffPage = () => {
  const staff = useStaff();
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const resetCode = useResetCode();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [payrollRef, setPayrollRef] = useState('');
  const [issued, setIssued] = useState<IssuedCode | null>(null);

  const employees = (staff.data ?? []).filter((user) => user.role === 'employee');

  const submit = () => {
    create.mutate(
      { name: name.trim(), ...(payrollRef.trim() ? { payrollRef: payrollRef.trim() } : {}) },
      {
        onSuccess: (result) => {
          setIssued(result);
          setAdding(false);
          setName('');
          setPayrollRef('');
        },
      },
    );
  };

  return (
    <DashboardShell
      title="Staff"
      subtitle={`${employees.length} ${employees.length === 1 ? 'person' : 'people'}`}
      actions={
        <Button
          variant="primary"
          onClick={() => {
            create.reset();
            setAdding(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add a staff member
        </Button>
      }
    >
      {staff.isError && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          {getApiErrorMessage(staff.error, 'Could not load staff')}
        </p>
      )}

      {/* A code is readable exactly once. Only a keyed hash is stored, so this
          panel is the single moment it exists in a form anyone can copy. */}
      {issued && (
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-brand/30 bg-brand/5 p-4">
          <KeyRound className="size-5 flex-shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0 flex-grow">
            <p className="text-sm font-semibold">
              {issued.user.name}&rsquo;s code is{' '}
              <span className="tabular tracking-[0.15em]">{issued.code}</span>
            </p>
            <p className="mt-1 text-sm text-content-muted">
              Send it with the punch link. It cannot be shown again — you would have to
              issue a new one.
            </p>
          </div>
          <Button onClick={() => setIssued(null)}>Done</Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        {staff.isPending ? (
          <TableSkeleton rows={5} />
        ) : employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff yet"
            hint="Add your first team member. They get a 4-digit code, and that plus the punch link is everything they need."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="text-xs tracking-[0.07em] text-content-muted uppercase">
                  <th className="px-5 py-3 text-left font-semibold">Name</th>
                  <th className="px-5 py-3 text-left font-semibold">Payroll ref</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td
                      className={`px-5 py-3.5 font-medium ${user.isActive ? '' : 'text-content-muted'}`}
                    >
                      {user.name}
                    </td>
                    <td className="tabular px-5 py-3.5 text-content-muted">
                      {user.payrollRef ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {user.isActive ? (
                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-semibold text-content-muted">
                          Left
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-3">
                        {user.isActive && (
                          <button
                            type="button"
                            onClick={() =>
                              resetCode.mutate(user.id, {
                                onSuccess: (result) => setIssued(result),
                              })
                            }
                            disabled={resetCode.isPending}
                            className="-my-3 rounded px-1.5 py-3 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
                          >
                            New code
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            update.mutate({ id: user.id, isActive: !user.isActive })
                          }
                          disabled={update.isPending}
                          className="-my-3 rounded px-1.5 py-3 text-sm font-medium text-content-muted hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
                        >
                          {user.isActive ? 'Mark as left' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-content-muted">
        Marking someone as left stops their code working. It never removes them from a
        week they already worked — those hours still export.
      </p>

      <Dialog
        open={adding}
        onOpenChange={setAdding}
        title="Add a staff member"
        description="They get a 4-digit code, shown once when you save."
      >
        <div className="space-y-4 px-6 pt-5">
          <div>
            <label htmlFor="staff-name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="staff-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 outline-none focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
            />
          </div>
          <div>
            <label htmlFor="staff-ref" className="block text-sm font-medium">
              Payroll reference <span className="text-content-muted">(optional)</span>
            </label>
            <input
              id="staff-ref"
              value={payrollRef}
              onChange={(event) => setPayrollRef(event.target.value)}
              autoComplete="off"
              className="tabular mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 outline-none focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
            />
            <p className="mt-2 text-xs text-content-muted">
              Whatever payroll knows them by. It goes in the CSV so the two can be
              matched up.
            </p>
          </div>

          {create.isError && (
            <p
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
            >
              {getApiErrorMessage(create.error, 'Could not add them')}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 pt-5">
          <Button onClick={() => setAdding(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={create.isPending || name.trim() === ''}
          >
            {create.isPending ? 'Adding…' : 'Add and issue a code'}
          </Button>
        </div>
      </Dialog>
    </DashboardShell>
  );
};

export default StaffPage;
