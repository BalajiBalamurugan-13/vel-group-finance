/**
 * VEL Finance — PageContainer Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Consistent wrapper for all page-level content.
 * Provides max-width, padding, and vertical layout structure.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** Remove max-width constraint for full-width pages */
  fullWidth?: boolean;
}

export function PageContainer({ children, className, fullWidth = false }: PageContainerProps) {
  return (
    <div
      className={cn(
        'w-full flex-1 px-4 py-6 sm:px-6 lg:px-8',
        !fullWidth && 'max-w-screen-2xl',
        className,
      )}
    >
      {children}
    </div>
  );
}
