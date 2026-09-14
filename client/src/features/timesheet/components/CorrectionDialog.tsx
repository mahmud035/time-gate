import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/api/axios.ts';
import { Button } from '@/components/ui/Button.tsx';
import { Dialog } from '@/components/ui/Dialog.tsx';
import type { PunchType } from '@/features/punch/punch.types.ts';
import { useAddPunch, useAmendPunch, useVoidPunch } from '../timesheet.hooks.ts';
import { londonLongDate, londonTime, toLondonInputValue } from '@/utils/time.ts';
import type { TimesheetRow } from '../timesheet.types.ts';

/**
 * What the manager is fixing. A missing punch is inserted; one that exists but
 * is wrong is amended. The dialog needs to know which, because the endpoints
 * differ and only one of them takes an id.
 */
export type Correction =
  | { kind: 'add'; row: TimesheetRow; type: PunchType; label: string }
  | { kind: 'amend'; row: TimesheetRow; punchId: string; at: string; label: string };

const LABEL: Record<PunchType, string> = {
  'clock-in': 'clock-in',
  'break-start': 'break start',
  'break-end': 'break end',
  'clock-out': 'clock-out',
};



export const CorrectionDialog = ({
  correction,
  onClose,
}: {
  correction: Correction | null;
  onClose: () => void;
}) => {
  const add = useAddPunch();
  const amend = useAmendPunch();
  const voidPunch = useVoidPunch();
  const [at, setAt] = useState('');

  useEffect(() => {
    if (!correction) return;

    add.reset();
    amend.reset();
    voidPunch.reset();
    setAt(
      correction.kind === 'amend'
        ? toLondonInputValue(correction.at)
        : toLondonInputValue(correction.row.clockOut ?? correction.row.clockIn),
    );
    // Re-seeded only when a different correction is opened.
  }, [correction]);

  if (!correction) return null;

  const pending = add.isPending || amend.isPending || voidPunch.isPending;
  const error = add.error ?? amend.error ?? voidPunch.error;

  const save = () => {
    if (correction.kind === 'add') {
      add.mutate(
        { userId: correction.row.userId, type: correction.type, at },
        { onSuccess: onClose },
      );

      return;
    }

    amend.mutate({ id: correction.punchId, at }, { onSuccess: onClose });
  };

  const timeOf = (iso: string | null, fallback: string) =>
    iso ? londonTime(iso) : fallback;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={correction.label}
      description={`${correction.row.name} · ${londonLongDate(correction.row.clockIn)}`}
    >
      <div className="space-y-4 px-6 pt-5">
        <div className="flex items-center gap-4 rounded-xl bg-surface-sunken px-4 py-3.5">
          <div>
            <div className="text-xs font-semibold tracking-[0.07em] text-content-muted uppercase">
              Clocked in
            </div>
            <div className="tabular mt-1 font-semibold">
              {timeOf(correction.row.clockIn, '—')}
            </div>
          </div>
          <span aria-hidden="true" className="text-border-strong">
            &rarr;
          </span>
          <div>
            <div className="text-xs font-semibold tracking-[0.07em] text-content-muted uppercase">
              Clocked out
            </div>
            <div className="tabular mt-1 font-semibold text-content-muted">
              {timeOf(correction.row.clockOut, 'not recorded')}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="correction-at" className="block text-sm font-medium">
            {correction.kind === 'add'
              ? `Time of the ${LABEL[correction.type]}`
              : 'New time'}
          </label>
          <input
            id="correction-at"
            type="datetime-local"
            value={at}
            onChange={(event) => setAt(event.target.value)}
            className="tabular mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 outline-none focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
          />
          <p className="mt-2 text-xs text-content-muted">
            Read as London time. A time that does not exist on a clock-change night is
            refused rather than quietly moved.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
          >
            {getApiErrorMessage(error, 'That change was not accepted')}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 p-6 pt-5">
        {correction.kind === 'amend' ? (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => voidPunch.mutate(correction.punchId, { onSuccess: onClose })}
          >
            Remove this punch
          </Button>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={pending || at === ''}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
