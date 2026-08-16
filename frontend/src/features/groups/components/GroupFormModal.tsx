import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSchemes } from '@/features/schemes/hooks/useSchemes';
import { useCreateGroup, useSuggestGroupName } from '../hooks/useGroups';
import type { GroupCreate } from '../types';
import type { ApiError } from '@/types/common';
import { cn } from '@/lib/cn';
import { Sparkles } from 'lucide-react';

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupFormModal({ isOpen, onClose }: GroupFormModalProps) {
  const { data: schemes = [], isLoading: isLoadingSchemes } = useSchemes();
  const { mutateAsync: createGroup, isPending: isCreating } = useCreateGroup();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<GroupCreate>({
    defaultValues: {
      location: '',
      group_name: '',
      scheme_id: '',
      start_date: new Date().toISOString().split('T')[0],
      remarks: '',
    },
  });

  const watchedLocation = watch('location');
  const watchedSchemeId = watch('scheme_id');

  // Query suggested running group name from backend helper endpoint
  const { data: suggestion, isFetching: isSuggesting } = useSuggestGroupName(
    watchedLocation || '',
    isOpen && Boolean(watchedLocation?.trim()),
  );

  // Auto-fill group name when backend suggestion changes, if user hasn't typed custom name yet
  useEffect(() => {
    if (suggestion?.suggested_name) {
      setValue('group_name', suggestion.suggested_name);
    }
  }, [suggestion, setValue]);

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: GroupCreate) => {
    setApiError(null);
    try {
      await createGroup({
        location: data.location.trim(),
        scheme_id: data.scheme_id,
        group_name: data.group_name?.trim() || undefined,
        start_date: data.start_date || undefined,
        remarks: data.remarks?.trim() || undefined,
      });
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || 'An error occurred while creating the group.');
    }
  };

  // Find selected active scheme configuration for informational read-only display
  const selectedScheme = schemes.find((s) => s.id === watchedSchemeId);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md my-8 rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-secondary-900">
          Create Finance Group
        </h2>

        {apiError && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Location Input */}
          <Input
            id="group_location"
            label="Location"
            placeholder="e.g. PTM, TNK, ABC"
            {...register('location', {
              required: 'Location is required',
              maxLength: 100,
            })}
            errorMessage={errors.location?.message}
          />

          {/* Scheme Selection */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="group_scheme_id"
              className="text-sm font-medium text-secondary-700"
            >
              Scheme <span className="text-error-500">*</span>
            </label>
            <select
              id="group_scheme_id"
              {...register('scheme_id', { required: 'Please select an active scheme' })}
              className={cn(
                'h-11 min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 text-sm text-secondary-900',
                'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                errors.scheme_id && 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
              )}
              disabled={isLoadingSchemes}
            >
              <option value="">-- Select Active Scheme --</option>
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.scheme_name} ({formatMoney(s.loan_amount)} · {s.total_weeks} weeks)
                </option>
              ))}
            </select>
            {errors.scheme_id && (
              <p className="text-xs text-error-600" role="alert">
                {errors.scheme_id.message}
              </p>
            )}
          </div>

          {/* Read-only Scheme Financial Details (informational) */}
          {selectedScheme && (
            <div className="rounded-lg bg-secondary-50 p-3.5 space-y-2 text-xs border border-border">
              <span className="font-semibold text-secondary-900 block text-xs">
                Scheme Financial Configuration (Read-only)
              </span>
              <div className="grid grid-cols-2 gap-2 text-secondary-600">
                <div>
                  Loan Amount: <span className="font-medium text-secondary-900">{formatMoney(selectedScheme.loan_amount)}</span>
                </div>
                <div>
                  Installment: <span className="font-medium text-secondary-900">{formatMoney(selectedScheme.weekly_installment)}/wk</span>
                </div>
                <div>
                  Duration: <span className="font-medium text-secondary-900">{selectedScheme.total_weeks} Weeks</span>
                </div>
                <div>
                  Note Cost: <span className="font-medium text-secondary-900">{formatMoney(selectedScheme.note_cost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Group Name (Auto-suggested with manual edit capability) */}
          <div className="relative">
            <Input
              id="group_name"
              label="Group Name"
              placeholder="e.g. PTM 1"
              helperText={
                isSuggesting
                  ? 'Generating running number...'
                  : suggestion?.suggested_name
                    ? `Suggested: ${suggestion.suggested_name} (you may edit)`
                    : 'Auto-suggested from Location'
              }
              rightElement={
                isSuggesting ? (
                  <Sparkles className="h-4 w-4 animate-spin text-primary-600" />
                ) : undefined
              }
              {...register('group_name', {
                required: 'Group name is required',
                maxLength: 255,
              })}
              errorMessage={errors.group_name?.message}
            />
          </div>

          {/* Start Date */}
          <Input
            id="group_start_date"
            type="date"
            label="Start Date (Optional)"
            {...register('start_date')}
            errorMessage={errors.start_date?.message}
          />

          {/* Remarks */}
          <Input
            id="group_remarks"
            label="Remarks (Optional)"
            placeholder="Add any operational notes..."
            {...register('remarks')}
            errorMessage={errors.remarks?.message}
          />

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Group
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
