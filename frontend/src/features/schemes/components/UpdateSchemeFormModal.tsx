import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUpdateScheme } from '../hooks/useSchemes';
import type { SchemeUpdate, Scheme } from '../types';
import type { ApiError } from '@/types/common';

interface Props {
  scheme: Scheme | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateSchemeFormModal({ scheme, isOpen, onClose }: Props) {
  const { mutateAsync: updateScheme, isPending } = useUpdateScheme();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchemeUpdate>();

  useEffect(() => {
    if (scheme) {
      reset({
        scheme_name: scheme.scheme_name,
        description: scheme.description || '',
      });
    }
  }, [scheme, reset]);

  if (!isOpen || !scheme) return null;

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: SchemeUpdate) => {
    setApiError(null);
    try {
      await updateScheme({ id: scheme.id, payload: data });
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || 'An error occurred while updating the scheme.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-secondary-900">Update Scheme</h2>
        
        {apiError && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="update_scheme_name"
            label="Scheme Name"
            {...register('scheme_name', { required: 'Scheme name is required', maxLength: 255 })}
            errorMessage={errors.scheme_name?.message}
          />
          <Input
            id="update_description"
            label="Description (Optional)"
            {...register('description')}
            errorMessage={errors.description?.message}
          />

          <div className="mt-4 rounded-lg bg-secondary-50 p-3 text-sm text-secondary-600">
            <strong>Note:</strong> Financial configurations (loan amount, weeks, etc.) cannot be modified to preserve historical records. Create a new scheme for different configurations.
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
