/**
 * VEL Finance — PageHeader Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Consistent page-level header with title, optional subtitle,
 * breadcrumbs, and an optional action slot.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { BreadcrumbItem } from '@/types';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-1 flex items-center gap-1" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.label} className="flex items-center gap-1">
                {index > 0 && (
                  <span className="text-xs text-secondary-400" aria-hidden="true">
                    /
                  </span>
                )}
                {crumb.path ? (
                  <a
                    href={crumb.path}
                    className="text-xs text-secondary-500 hover:text-secondary-700 transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-xs text-secondary-400" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title */}
        <h1 className="text-2xl font-semibold text-secondary-900 truncate">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-1 text-sm text-secondary-500">{subtitle}</p>
        )}
      </div>

      {/* Action Slot */}
      {action && (
        <div className="flex-shrink-0 flex items-center gap-3">{action}</div>
      )}
    </div>
  );
}
