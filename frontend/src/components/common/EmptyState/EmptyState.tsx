/**
 * VEL Finance — EmptyState Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Per 08_UI_UX_GUIDELINES.md: Never display blank screens.
 * Every empty state should guide the user with an illustration,
 * title, description, and primary action.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  /** Icon or illustration — rendered above the title */
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

function DefaultIcon() {
  return (
    <svg
      className="w-12 h-12 text-secondary-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className,
      )}
    >
      {/* Icon / Illustration */}
      <div className="mb-4 p-4 rounded-full bg-secondary-50">
        {icon ?? <DefaultIcon />}
      </div>

      {/* Text */}
      <h3 className="text-base font-semibold text-secondary-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-secondary-500 max-w-xs mb-6">{description}</p>
      )}

      {/* Action */}
      {action && <div>{action}</div>}
    </div>
  );
}
