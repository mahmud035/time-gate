import { Circle, CircleMinus, Pause, TriangleAlert } from 'lucide-react';
import type { PunchState } from '@/features/punch/punch.types.ts';
import type { ShiftStatus } from '@/features/timesheet/timesheet.types.ts';

/**
 * Colour is never the only signal.
 *
 * Every badge carries a word and a shape as well as a tint, so it still reads
 * in greyscale, to a colour-blind manager, and in a printed timesheet.
 */
const base =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap';

export const StateBadge = ({ state }: { state: PunchState }) => {
  if (state === 'clocked-in') {
    return (
      <span className={`${base} bg-success/10 text-success`}>
        <Circle className="size-2.5 fill-current" aria-hidden="true" />
        On shift
      </span>
    );
  }

  if (state === 'on-break') {
    return (
      <span className={`${base} bg-warning/15 text-warning`}>
        <Pause className="size-3 fill-current" aria-hidden="true" />
        On a break
      </span>
    );
  }

  return (
    <span className={`${base} bg-surface-sunken text-content-muted`}>
      <CircleMinus className="size-3" aria-hidden="true" />
      Not in
    </span>
  );
};

export const ShiftStatusBadge = ({ status }: { status: ShiftStatus }) => {
  if (status === 'complete') {
    return (
      <span className={`${base} bg-success/10 text-success`}>
        <Circle className="size-2.5 fill-current" aria-hidden="true" />
        Complete
      </span>
    );
  }

  if (status === 'open') {
    return (
      <span className={`${base} bg-brand/10 text-brand`}>
        <Circle className="size-2.5 fill-current" aria-hidden="true" />
        In progress
      </span>
    );
  }

  return (
    <span className={`${base} bg-warning/15 text-warning`}>
      <TriangleAlert className="size-3" aria-hidden="true" />
      Needs review
    </span>
  );
};
