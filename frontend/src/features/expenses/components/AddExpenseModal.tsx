/**
 * VEL Finance — Add Expense Modal
 * ===============================
 * Fast, intuitive modal to record operational business expenses.
 * Deducts directly from Available Cash on the Dashboard.
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { X, Receipt, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLanguage } from '@/i18n';
import { useAddExpense } from '../hooks/useExpenses';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number, note: string) => void;
}

interface FormValues {
  amount: number;
  note: string;
  date: string;
  category: string;
}

export function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const { t } = useLanguage();
  const { mutateAsync: addExpense, isPending } = useAddExpense();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      amount: '' as unknown as number,
      note: '',
      date: todayStr,
      category: 'General',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        amount: '' as unknown as number,
        note: '',
        date: todayStr,
        category: 'General',
      });
      setErrorMsg(null);
    }
  }, [isOpen, reset, todayStr]);

  if (!isOpen) return null;

  const onSubmit = async (values: FormValues) => {
    try {
      setErrorMsg(null);
      await addExpense({
        amount: Number(values.amount),
        note: values.note.trim(),
        date: values.date,
        category: values.category || 'General',
      });
      if (onSuccess) {
        onSuccess(Number(values.amount), values.note.trim());
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to record expense.';
      setErrorMsg(msg);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-secondary-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-expense-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-error-50 border border-error-200/60 flex items-center justify-center text-error-600 flex-shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 id="add-expense-modal-title" className="text-base font-bold text-secondary-900">
                {t('expenses.addExpense') || 'Record Business Expense'}
              </h2>
              <p className="text-xs text-secondary-500 mt-0.5">
                {t('expenses.addExpenseSub') || 'Deducts directly from Available Cash'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-error-50 p-3 text-xs text-error-700 border border-error-200">
              {errorMsg}
            </div>
          )}

          {/* Amount */}
          <div>
            <Input
              id="expense-amount"
              type="number"
              step="1"
              label={`${t('common.amount') || 'Amount'} (₹) *`}
              placeholder="e.g. 500"
              autoFocus
              {...register('amount', {
                required: 'Please enter expense amount',
                min: { value: 1, message: 'Amount must be greater than 0' },
                valueAsNumber: true,
              })}
              errorMessage={errors.amount?.message}
            />
          </div>

          {/* Note / Description */}
          <div>
            <Input
              id="expense-note"
              type="text"
              label={`${t('expenses.note') || 'Expense Note / Reason'} *`}
              placeholder="e.g. Tea & petrol, paper printing, office expense"
              {...register('note', {
                required: 'Please enter note or reason for expense',
                maxLength: { value: 200, message: 'Max 200 characters' },
              })}
              errorMessage={errors.note?.message}
            />
          </div>

          {/* Date */}
          <div>
            <Input
              id="expense-date"
              type="date"
              label={`${t('common.date') || 'Date'} *`}
              {...register('date', {
                required: 'Please select expense date',
              })}
              errorMessage={errors.date?.message}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending}
              isLoading={isPending}
              className="bg-error-600 hover:bg-error-700 text-white"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              {isPending ? (t('common.saving') || 'Saving...') : (t('expenses.saveExpense') || 'Record Expense')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
