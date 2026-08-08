/**
 * VEL Finance — Section Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Semantic content section with title and optional description.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function Section({ title, description, children, className, action }: SectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-secondary-900">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-secondary-500">{description}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}
