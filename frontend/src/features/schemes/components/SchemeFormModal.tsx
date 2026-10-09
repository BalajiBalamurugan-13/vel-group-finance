import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateScheme, useUpdateSchemeStatus } from '../hooks/useSchemes';
import { useLanguage } from '@/i18n';
import type { SchemeCreate } from '../types';
import type { ApiError } from '@/types/common';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * State shape for when the backend signals that an inactive scheme
 * with the same name and identical financial values exists.
 * The frontend offers a "Reactivate" action instead of a plain error.
 */
interface ReactivatableConflict {
  schemeId: string;
  message: string;
}

export function SchemeFormModal({ isOpen, onClose }: Props) {
  const { t, language } = useLanguage();
  const { mutateAsync: createScheme, isPending: isCreating } = useCreateScheme();
  const { mutateAsync: updateStatus, isPending: isReactivating } = useUpdateSchemeStatus();

  const [apiError, setApiError] = useState<string | null>(null);
  const [reactivatable, setReactivatable] = useState<ReactivatableConflict | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchemeCreate>({
    defaultValues: { note_cost: 0 },
  });

  const isPending = isCreating || isReactivating;

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
    setReactivatable(null);
    onClose();
  };

  const onSubmit = async (data: SchemeCreate) => {
    setApiError(null);
    setReactivatable(null);
    try {
      await createScheme(data);
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;

      if (apiErr.code === 'INACTIVE_SCHEME_REACTIVATABLE' && apiErr.schemeId) {
        // SCENARIO 1: Inactive scheme with identical financial values exists.
        // Offer the user a "Reactivate" action.
        setReactivatable({
          schemeId: apiErr.schemeId,
          message: apiErr.message,
        });
      } else {
        // SCENARIO 2 & 3: Non-reactivatable conflict or other error.
        setApiError(apiErr.message || 'An error occurred while creating the scheme.');
      }
    }
  };

  const handleReactivate = async () => {
    if (!reactivatable) return;
    setApiError(null);
    try {
      await updateStatus({ id: reactivatable.schemeId, payload: { status: 'Active' } });
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setReactivatable(null);
      setApiError(apiErr.message || 'Failed to reactivate the scheme.');
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
              {language === 'ta' ? 'புதிய கடன் திட்டம்' : 'Create Scheme'}
            </h2>
            <p className="text-xs text-secondary-500 mt-0.5">
              {language === 'ta' ? 'கடன் தொகை, கால அளவு மற்றும் தவணை விதிகளை அமைக்கவும்' : 'Configure loan amount, duration, and installment rules'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors"
            aria-label={t('common.close')}
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
            {/* Generic API error */}
            {apiError && (
              <div className="rounded-lg bg-error-50 p-3 text-sm text-error-600 border border-error-200">
                {apiError}
              </div>
            )}

            {/* Reactivatable conflict */}
            {reactivatable && (
              <div className="rounded-lg border border-warning-500 bg-warning-50 p-4">
                <p className="mb-3 text-sm text-secondary-700">
                  {reactivatable.message}
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setReactivatable(null)}
                    disabled={isPending}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    isLoading={isReactivating}
                    onClick={handleReactivate}
                  >
                    {language === 'ta' ? 'திட்டத்தை மீண்டும் இயக்கு' : 'Reactivate Scheme'}
                  </Button>
                </div>
              </div>
            )}

            <Input
              id="scheme_name"
              label={`${language === 'ta' ? 'திட்டத்தின் பெயர்' : 'Scheme Name'} *`}
              {...register('scheme_name', {
                required: language === 'ta' ? 'திட்டத்தின் பெயர் தேவை' : 'Scheme name is required',
                maxLength: 255,
              })}
              errorMessage={errors.scheme_name?.message}
            />
            <Input
              id="description"
              label={language === 'ta' ? 'விளக்கம் (விருப்பம்)' : 'Description (Optional)'}
              {...register('description')}
              errorMessage={errors.description?.message}
            />
            <Input
              id="loan_amount"
              type="number"
              step="0.01"
              label={`${language === 'ta' ? 'கடன் அசல் தொகை (₹)' : 'Loan Amount (₹)'} *`}
              {...register('loan_amount', {
                valueAsNumber: true,
                min: { value: 0.01, message: language === 'ta' ? '0-ஐ விட அதிகமாக இருக்க வேண்டும்' : 'Must be greater than 0' },
              })}
              errorMessage={errors.loan_amount?.message}
            />
            <Input
              id="weekly_installment"
              type="number"
              step="0.01"
              label={`${language === 'ta' ? 'வாரத் தவணை (₹)' : 'Weekly Installment (₹)'} *`}
              {...register('weekly_installment', {
                valueAsNumber: true,
                min: { value: 0.01, message: language === 'ta' ? '0-ஐ விட அதிகமாக இருக்க வேண்டும்' : 'Must be greater than 0' },
              })}
              errorMessage={errors.weekly_installment?.message}
            />
            <Input
              id="total_weeks"
              type="number"
              label={`${language === 'ta' ? 'மொத்த வாரங்கள்' : 'Total Weeks'} *`}
              {...register('total_weeks', {
                valueAsNumber: true,
                min: { value: 1, message: language === 'ta' ? '0-ஐ விட அதிகமாக இருக்க வேண்டும்' : 'Must be greater than 0' },
              })}
              errorMessage={errors.total_weeks?.message}
            />
            <Input
              id="note_cost"
              type="number"
              step="0.01"
              label={language === 'ta' ? 'நோட் செலவு / கட்டணம் (₹)' : 'Note Cost (₹)'}
              {...register('note_cost', {
                valueAsNumber: true,
                min: { value: 0, message: language === 'ta' ? 'எதிர்மறை எண்ணாக இருக்கக்கூடாது' : 'Cannot be negative' },
              })}
              errorMessage={errors.note_cost?.message}
            />
          </div>

          {/* Pinned Sticky Footer */}
          <div className="shrink-0 border-t border-border bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={handleClose} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            {!reactivatable && (
              <Button type="submit" size="sm" isLoading={isCreating}>
                {language === 'ta' ? 'திட்டத்தை உருவாக்கு' : 'Create Scheme'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
