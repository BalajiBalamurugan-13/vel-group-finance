/**
 * VEL Finance — Badge Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Status badge for displaying categorical states.
 * Per 09_DESIGN_SYSTEM.md: never rely only on colors — include text label.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { StatusVariant } from '@/types';

export interface BadgeProps {
  variant?: StatusVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  success: 'bg-success-50 text-success-700 ring-success-600/20',
  warning: 'bg-warning-50 text-warning-700 ring-warning-600/20',
  error: 'bg-error-50 text-error-700 ring-error-600/20',
  info: 'bg-info-50 text-info-700 ring-info-600/20',
  neutral: 'bg-secondary-100 text-secondary-600 ring-secondary-500/20',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5',
        'text-xs font-medium rounded-full',
        'ring-1 ring-inset',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
