/**
 * VEL Finance — LoadingState Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable loading indicator.
 * Use `fullPage` for route-level loading; default (false) centers within the
 * available content area so it works inside PageContainer without spanning
 * the full viewport.
 */
import { Spinner } from '@/components/ui/Spinner';

interface LoadingStateProps {
  label?: string;
  /** When true, fills the entire viewport height (route-level loading).
   *  When false (default), fills and centers within the nearest block context. */
  fullPage?: boolean;
}

export function LoadingState({
  label = 'Loading...',
  fullPage = false,
}: LoadingStateProps) {
  return (
    <div
      className={
        fullPage
          ? 'min-h-screen flex flex-col items-center justify-center bg-background'
          : 'flex flex-col items-center justify-center py-20 w-full'
      }
      role="status"
      aria-label={label}
    >
      <Spinner size="lg" />
      <p className="mt-3 text-sm text-secondary-500 font-medium">{label}</p>
    </div>
  );
}
