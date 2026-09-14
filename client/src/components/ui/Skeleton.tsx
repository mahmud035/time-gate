/**
 * Shaped like the thing it is standing in for, so the layout does not jump when
 * the data lands. A spinner would say "something is happening" and nothing else.
 */
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-surface-sunken ${className}`} />
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3 p-5" aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="flex items-center gap-4">
        <Skeleton className="h-5 flex-grow" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
    ))}
  </div>
);
