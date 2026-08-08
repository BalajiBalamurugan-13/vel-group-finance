/**
 * VEL Finance — Button Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Primary interactive element. Implements all variants from 09_DESIGN_SYSTEM.md.
 *
 * Variants: primary | secondary | outline | ghost | danger
 * Sizes: sm | md | lg
 * States: default | hover | active | disabled | loading
 *
 * Accessibility:
 * - Minimum 44px height (per 08_UI_UX_GUIDELINES.md)
 * - Proper disabled state handling
 * - Loading state with spinner and aria-busy
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/Spinner';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

// ── Style Maps ────────────────────────────────────────────────────────────────

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-primary-600 text-white',
    'hover:bg-primary-700',
    'active:bg-primary-800',
    'focus-visible:ring-primary-500',
    'disabled:bg-primary-200 disabled:text-primary-400',
  ].join(' '),

  secondary: [
    'bg-secondary-100 text-secondary-700',
    'hover:bg-secondary-200',
    'active:bg-secondary-300',
    'focus-visible:ring-secondary-400',
    'disabled:bg-secondary-50 disabled:text-secondary-300',
  ].join(' '),

  outline: [
    'border border-border-strong bg-transparent text-secondary-700',
    'hover:bg-secondary-50',
    'active:bg-secondary-100',
    'focus-visible:ring-secondary-400',
    'disabled:border-border disabled:text-secondary-300',
  ].join(' '),

  ghost: [
    'bg-transparent text-secondary-600',
    'hover:bg-secondary-100 hover:text-secondary-700',
    'active:bg-secondary-200',
    'focus-visible:ring-secondary-400',
    'disabled:text-secondary-300',
  ].join(' '),

  danger: [
    'bg-error-600 text-white',
    'hover:bg-error-700',
    'active:bg-error-800',
    'focus-visible:ring-error-500',
    'disabled:bg-error-200 disabled:text-error-300',
  ].join(' '),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 min-h-[36px] px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 min-h-[44px] px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 min-h-[48px] px-6 text-base gap-2 rounded-xl',
};

// ── Component ─────────────────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        className={cn(
          // Base
          'inline-flex items-center justify-center font-medium',
          'transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:pointer-events-none',
          // Variant
          variantClasses[variant],
          // Size
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" className="text-current" />
            {loadingText ?? children}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
