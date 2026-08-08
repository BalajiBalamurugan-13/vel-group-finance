/**
 * VEL Finance — LoadingState Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-page loading state shown during route lazy loading.
 */
import { Spinner } from '@/components/ui/Spinner';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-background"
      role="status"
      aria-label={label}
    >
      <Spinner size="lg" />
      <p className="mt-4 text-sm text-secondary-500">{label}</p>
    </div>
  );
}
