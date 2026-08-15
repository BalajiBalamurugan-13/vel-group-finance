import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateScheme } from '../hooks/useSchemes';
import type { SchemeCreate } from '../types';
import type { ApiError } from '@/types/common';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SchemeFormModal({ isOpen, onClose }: Props) {
  const { mutateAsync: createScheme, isPending } = useCreateScheme();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchemeCreate>({
    defaultValues: { note_cost: 0 },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: SchemeCreate) => {
    setApiError(null);
    try {
      await createScheme(data);
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || 'An error occurred while creating the scheme.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-secondary-900">Create Scheme</h2>
        
        {apiError && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600">
            {apiError}
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
            <Button type="submit" isLoading={isPending}>
              Create Scheme
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
