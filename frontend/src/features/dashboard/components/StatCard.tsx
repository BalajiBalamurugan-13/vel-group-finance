/**
 * VEL Finance — Dashboard StatCard Component
 * ============================================
 * Displays a single KPI metric with an icon, label, and formatted value.
 * Monetary values are formatted using Intl.NumberFormat (₹ INR) — display only.
 * No financial arithmetic is performed here.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type StatCardVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatCardProps {
  id?: string;
  label: string;
  /** Raw string or number to display */
  value: string | number;
  /** Optional sub-label / description */
  sublabel?: string;
  icon: ReactNode;
  variant?: StatCardVariant;
  /** If true, format value as Indian Rupees */
  isCurrency?: boolean;
  className?: string;
}

const variantStyles: Record<StatCardVariant, { iconBg: string; iconText: string; accent: string }> = {
  primary:  { iconBg: 'bg-primary-100',   iconText: 'text-primary-600',   accent: 'border-l-primary-500' },
  success:  { iconBg: 'bg-success-100',   iconText: 'text-success-600',   accent: 'border-l-success-500' },
  warning:  { iconBg: 'bg-warning-100',   iconText: 'text-warning-600',   accent: 'border-l-warning-500' },
  danger:   { iconBg: 'bg-error-100',     iconText: 'text-error-600',     accent: 'border-l-error-500' },
  info:     { iconBg: 'bg-info-100',      iconText: 'text-info-600',      accent: 'border-l-info-500' },
  neutral:  { iconBg: 'bg-secondary-100', iconText: 'text-secondary-600', accent: 'border-l-secondary-400' },
};

/**
 * Format a decimal string as Indian Rupees.
 * Uses Intl.NumberFormat for locale-correct display only.
 * No arithmetic is performed.
 */
function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function StatCard({
  id,
  label,
  value,
  sublabel,
  icon,
  variant = 'neutral',
  isCurrency = false,
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const displayValue = isCurrency ? formatCurrency(value) : value;

  return (
    <div
      id={id}
      className={cn(
        'bg-surface border border-border rounded-xl shadow-sm',
        'border-l-4 p-3.5 sm:p-4',
        'transition-shadow duration-200 hover:shadow-md',
        styles.accent,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-secondary-500 uppercase tracking-wide truncate">
            {label}
          </p>
          <p
            className={cn(
              'mt-1 text-xl sm:text-2xl font-bold text-secondary-900 truncate',
              isCurrency && 'font-mono',
            )}
            aria-label={`${label}: ${displayValue}`}
          >
            {displayValue}
          </p>
          {sublabel && (
            <p className="mt-0.5 text-[11px] text-secondary-400 truncate">{sublabel}</p>
          )}
        </div>

        <div
          className={cn(
            'flex-shrink-0 flex items-center justify-center',
            'h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl',
            styles.iconBg,
            styles.iconText,
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
