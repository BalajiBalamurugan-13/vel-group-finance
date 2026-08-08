/**
 * VEL Finance — Input Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Form input with label, helper text, and error message support.
 * Per 09_DESIGN_SYSTEM.md: every input must support label, placeholder,
 * helper text, and error message.
 */
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  /** Unique ID — required when label is provided for proper association */
  id: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      helperText,
      errorMessage,
      leftElement,
      rightElement,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const hasError = Boolean(errorMessage);
    const descriptionId = helperText ? `${id}-description` : undefined;
    const errorId = hasError ? `${id}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-secondary-700"
          >
            {label}
            {props.required && (
              <span className="ml-1 text-error-500" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Input Wrapper */}
        <div className="relative flex items-center">
          {/* Left Element */}
          {leftElement && (
            <div className="pointer-events-none absolute left-3 flex items-center text-secondary-400">
              {leftElement}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              [descriptionId, errorId].filter(Boolean).join(' ') || undefined
            }
            className={cn(
              // Base
              'w-full h-11 min-h-[44px] rounded-lg border bg-surface text-sm text-secondary-900',
              'placeholder:text-secondary-400',
              'transition-colors duration-fast',
              // Focus
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              // Padding
              leftElement ? 'pl-10' : 'pl-3',
              rightElement ? 'pr-10' : 'pr-3',
              // State: normal
              !hasError && [
                'border-border',
                'hover:border-border-strong',
                'focus:border-primary-500 focus:ring-primary-500/20',
              ],
              // State: error
              hasError && [
                'border-error-500',
                'focus:border-error-500 focus:ring-error-500/20',
              ],
              // State: disabled
              disabled && 'bg-secondary-50 text-secondary-400 cursor-not-allowed',
              className,
            )}
            {...props}
          />

          {/* Right Element */}
          {rightElement && (
            <div className="absolute right-3 flex items-center text-secondary-400">
              {rightElement}
            </div>
          )}
        </div>

        {/* Helper Text */}
        {helperText && !hasError && (
          <p id={descriptionId} className="text-xs text-secondary-500">
            {helperText}
          </p>
        )}

        {/* Error Message */}
        {hasError && (
          <p id={errorId} className="text-xs text-error-600" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
