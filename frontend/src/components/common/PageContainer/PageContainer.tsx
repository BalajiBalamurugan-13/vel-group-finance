/**
 * VEL Finance — PageContainer Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Consistent wrapper for all page-level content.
 * Provides responsive padding and vertical layout structure.
 *
 * No max-width constraint — financial tables and data-heavy screens need
 * access to the full available content area. Individual pages can apply
 * their own max-width or grid constraints where appropriate.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** Reduce horizontal padding for full-bleed content (e.g. embedded maps) */
  noPadding?: boolean;
}

export function PageContainer({ children, className, noPadding = false }: PageContainerProps) {
  return (
    <div
      className={cn(
        'w-full flex-1 min-w-0',
        !noPadding && 'px-4 py-6 sm:px-6 lg:px-8 xl:px-10',
        className,
      )}
    >
      {children}
    </div>
  );
}

