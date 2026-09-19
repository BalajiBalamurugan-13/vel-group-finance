/**
 * VEL Finance — Card Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Surface container with header, content, and footer sections.
 * Per 09_DESIGN_SYSTEM.md: Cards use small elevation, rounded corners.
 */
import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// ── Sub-components ────────────────────────────────────────────────────────────

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'px-4 py-3 border-b border-border flex items-center justify-between gap-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('px-4 py-3', className)}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        'px-4 py-2.5 border-t border-border bg-secondary-50/50 rounded-b-xl',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Root Card ─────────────────────────────────────────────────────────────────

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Remove padding for tables or full-bleed content */
  noPadding?: boolean;
}

export function Card({ children, className, noPadding = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative bg-surface border border-border rounded-xl',
        'shadow-sm',
        !noPadding && '',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Attach sub-components ─────────────────────────────────────────────────────
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;
