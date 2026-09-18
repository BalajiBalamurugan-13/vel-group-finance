/**
 * VEL Finance — Select Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Form select dropdown with label, helper text, error message, left icon,
 * and built-in right Chevron arrow support.
 *
 * Ensures proper spacing between icons and text, vertical alignment,
 * dropdown arrow positioning on the far right, and clean truncation for
 * long text/Tamil values.
 */
import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftElement?: ReactNode;
  id?: string;
  children?: ReactNode;
  options?: SelectOption[];
  placeholder?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      id,
      label,
      helperText,
      errorMessage,
      leftElement,
      className,
      disabled,
      children,
      options,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const hasError = Boolean(errorMessage);
    const descriptionId = helperText && id ? `${id}-description` : undefined;
    const errorId = hasError && id ? `${id}-error` : undefined;

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

        {/* Select Wrapper */}
        <div className="relative flex items-center">
          {/* Left Element (e.g. MapPin, Users icon) */}
          {leftElement && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center justify-center text-secondary-400 z-10">
              {leftElement}
            </div>
          )}

          {/* Native Select */}
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              [descriptionId, errorId].filter(Boolean).join(' ') || undefined
            }
            className={cn(
              // Base: full width, 44px min-height, border, background, typography
              'w-full h-11 min-h-[44px] rounded-lg border bg-surface text-sm text-secondary-900',
              'transition-colors duration-fast appearance-none cursor-pointer',
              'truncate',
              // Focus state
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              // Spacing: proper clearance for leftElement and right Chevron arrow
              leftElement ? 'pl-10' : 'pl-3.5',
              'pr-9',
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
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Chevron Dropdown Arrow (Pinned far right, vertically centered) */}
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center justify-center text-secondary-400">
            <ChevronDown className="h-4 w-4 shrink-0" />
          </div>
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

Select.displayName = 'Select';
