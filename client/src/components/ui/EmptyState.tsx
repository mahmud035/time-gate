import type { LucideIcon } from 'lucide-react';

/**
 * An empty table says what to do next, never just "no data" — the manager is
 * usually here because they expected to see something.
 */
export const EmptyState = ({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
}) => (
  <div className="px-6 py-14 text-center">
    <Icon className="mx-auto size-7 text-content-muted" aria-hidden="true" />
    <p className="mt-3 font-medium">{title}</p>
    <p className="mx-auto mt-1.5 max-w-sm text-sm text-content-muted">{hint}</p>
  </div>
);
