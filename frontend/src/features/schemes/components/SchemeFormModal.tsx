import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateScheme, useUpdateSchemeStatus } from '../hooks/useSchemes';
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

  if (!isOpen) return null;

  const isPending = isCreating || isReactivating;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-secondary-900">Create Scheme</h2>

        {/* Generic API error (scenarios 2, 3, network) */}
        {apiError && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600">
            {apiError}
          </div>
        )}

        {/* Reactivatable conflict (scenario 1) */}
        {reactivatable && (
          <div className="mb-4 rounded-lg border border-warning-500 bg-warning-50 p-4">
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
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                isLoading={isReactivating}
                onClick={handleReactivate}
              >
                Reactivate Scheme
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="scheme_name"
            label="Scheme Name"
            {...register('scheme_name', { required: 'Scheme name is required', maxLength: 255 })}
            errorMessage={errors.scheme_name?.message}
          />
          <Input
            id="description"
            label="Description (Optional)"
            {...register('description')}
            errorMessage={errors.description?.message}
          />
          <Input
            id="loan_amount"
            type="number"
            step="0.01"
            label="Loan Amount"
            {...register('loan_amount', { valueAsNumber: true, min: { value: 0.01, message: 'Must be greater than 0' } })}
            errorMessage={errors.loan_amount?.message}
          />
          <Input
            id="weekly_installment"
            type="number"
            step="0.01"
            label="Weekly Installment"
            {...register('weekly_installment', { valueAsNumber: true, min: { value: 0.01, message: 'Must be greater than 0' } })}
            errorMessage={errors.weekly_installment?.message}
          />
          <Input
            id="total_weeks"
            type="number"
            label="Total Weeks"
            {...register('total_weeks', { valueAsNumber: true, min: { value: 1, message: 'Must be greater than 0' } })}
            errorMessage={errors.total_weeks?.message}
          />
          <Input
            id="note_cost"
            type="number"
            step="0.01"
            label="Note Cost"
            {...register('note_cost', { valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' } })}
            errorMessage={errors.note_cost?.message}
          />

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            {/* Hide the Create button while the reactivation prompt is shown */}
            {!reactivatable && (
              <Button type="submit" isLoading={isCreating}>
                Create Scheme
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
