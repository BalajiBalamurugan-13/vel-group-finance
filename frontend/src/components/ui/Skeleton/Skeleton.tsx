/**
 * VEL Finance — Skeleton Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Animated loading placeholder.
 * Per 08_UI_UX_GUIDELINES.md: skeleton loaders must be used.
 * Per 09_DESIGN_SYSTEM.md: every page must have card/table/list skeletons.
 */
import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
  /** Accessibility label for screen readers */
  'aria-label'?: string;
}

/** Base skeleton pulse animation */
export function Skeleton({ className, 'aria-label': ariaLabel }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-secondary-200', className)}
      role="status"
      aria-label={ariaLabel ?? 'Loading...'}
      aria-busy="true"
    />
  );
}

// ── Composition Helpers ───────────────────────────────────────────────────────

/** Skeleton for a stat/summary card */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-xl p-6 space-y-3',
        className,
      )}
      role="status"
      aria-label="Loading card..."
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/** Skeleton for a table row */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton for a table */
export function TableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div
      role="status"
      aria-label="Loading table..."
      className="overflow-hidden rounded-xl border border-border"
    >
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-secondary-50">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Skeleton for a list item */
export function ListItemSkeleton() {
  return (
    <div
      className="flex items-center gap-3 p-4 border-b border-border last:border-b-0"
      aria-hidden="true"
    >
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}
