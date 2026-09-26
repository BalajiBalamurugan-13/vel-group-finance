import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateInvestment } from '../hooks/useProfit';
import type { InvestmentCreate } from '../types';
import type { ApiError } from '@/types/common';
import { cn } from '@/lib/cn';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InvestmentModal({ isOpen, onClose, onSuccess }: InvestmentModalProps) {
  const { mutateAsync: createInvestment, isPending } = useCreateInvestment();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvestmentCreate>({
    defaultValues: {
      investment_type: 'Additional',
      amount: undefined,
      investment_date: new Date().toISOString().split('T')[0],
      description: '',
    },
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPending]);

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: InvestmentCreate) => {
    setApiError(null);
    try {
      await createInvestment({
        investment_type: data.investment_type,
        amount: Number(data.amount),
        investment_date: data.investment_date,
        description: data.description?.trim() || undefined,
      });
      onSuccess?.();
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || 'Failed to record owner investment.');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-secondary-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) {
          handleClose();
        }
      }}
    >
      <div
        className="flex flex-col w-full sm:max-w-md max-h-[92vh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface shrink-0">
          <div>
            <h2 className="text-base font-bold text-secondary-900">
              Record Owner Investment
            </h2>
            <p className="text-xs text-secondary-500 mt-0.5">
              Capital introduced into business (separate from recycled cash)
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {apiError && (
              <div className="rounded-lg bg-error-50 p-3 text-sm text-error-600 border border-error-200">
                {apiError}
              </div>
            )}

            {/* Investment Type */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="investment_type" className="text-sm font-medium text-secondary-900">
                Investment Type *
              </label>
              <select
                id="investment_type"
                {...register('investment_type', { required: 'Type is required' })}
                className={cn(
                  'w-full h-10 px-3 rounded-lg border border-border bg-surface text-secondary-900 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
                )}
              >
                <option value="Additional">Additional Investment (Capital added in later weeks)</option>
                <option value="Initial">Initial Investment (Starting capital on 9 Aug 2026)</option>
              </select>
            </div>

            {/* Amount */}
            <Input
              id="amount"
              type="number"
              step="100"
              min="1"
              label="Amount (₹) *"
              placeholder="e.g. 500000"
              required
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 1, message: 'Amount must be greater than 0' },
              })}
              errorMessage={errors.amount?.message}
            />

            {/* Date */}
            <Input
              id="investment_date"
              type="date"
              label="Investment Date *"
              required
              {...register('investment_date', {
                required: 'Investment date is required',
              })}
              errorMessage={errors.investment_date?.message}
            />

            {/* Description */}
            <Input
              id="description"
              label="Description / Purpose (Optional)"
              placeholder="e.g. Capital injection for 5 new groups"
              {...register('description')}
            />
          </div>

          {/* Pinned Sticky Footer */}
          <div className="shrink-0 border-t border-border bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isPending}>
              Record Investment
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
