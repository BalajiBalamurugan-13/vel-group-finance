/**
 * VEL Finance — Toast Notification Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight toast notifications for success/error feedback.
 * Auto-dismisses after a configurable duration.
 * Positioned at top-center, above modals.
 */
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { TOAST_DURATION_MS } from '@/constants/app';

export type ToastVariant = 'success' | 'error';

export interface ToastProps {
  message: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  onClose: () => void;
  icon?: ReactNode;
}

const variantStyles: Record<ToastVariant, string> = {
  success:
    'bg-secondary-900/95 text-white border-secondary-800/80 shadow-2xl backdrop-blur-md',
  error:
    'bg-secondary-900/95 text-white border-secondary-800/80 shadow-2xl backdrop-blur-md',
};

const variantIcons: Record<ToastVariant, ReactNode> = {
  success: (
    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
    </div>
  ),
  error: (
    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-rose-500/20 flex items-center justify-center mt-0.5">
      <XCircle className="h-3.5 w-3.5 text-rose-400" />
    </div>
  ),
};

export function Toast({
  message,
  description,
  variant = 'success',
  duration = TOAST_DURATION_MS,
  onClose,
  icon,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 150);
  }, [onClose]);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto dismiss
    const timer = setTimeout(handleClose, duration);
    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="vel-toast" role="status" aria-live="polite">
      <div
        className={cn(
          'flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-xl',
          'transition-all duration-200 ease-out',
          variantStyles[variant],
          isVisible && !isExiting
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2',
        )}
      >
        {icon || variantIcons[variant]}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-xs sm:text-sm font-semibold text-white leading-snug">{message}</p>
          {description && (
            <p className="mt-0.5 text-xs text-secondary-300 leading-normal">{description}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 rounded-md p-1 text-secondary-400 hover:text-white hover:bg-secondary-800 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>,
    document.body
  );
}
