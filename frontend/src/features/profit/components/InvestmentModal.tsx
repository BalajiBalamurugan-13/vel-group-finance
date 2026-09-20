import { useState } from 'react';
import { useForm } from 'react-hook-form';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md my-8 rounded-xl bg-surface p-5 sm:p-6 shadow-xl border border-border">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-secondary-900">
            Record Owner Investment
          </h2>
          <p className="text-xs text-secondary-500 mt-1">
            Owner capital introduced into the business. Strictly kept separate from recycled customer collections.
          </p>
        </div>

        {apiError && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 border border-error-200">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
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
    </div>
  );
}
