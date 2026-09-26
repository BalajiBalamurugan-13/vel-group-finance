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
  /** Called with the created group after successful creation */
  onSuccess?: (group: { group_name: string; group_code?: string | null }) => void;
}

export function GroupFormModal({ isOpen, onClose, onSuccess }: GroupFormModalProps) {
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
      funding_source: 'Recycled Collections',
      recycled_sub_type: 'Fully Recycled',
      owner_investment_amount: 0,
      remarks: '',
    },
  });

  const watchedLocation = watch('location');
  const watchedSchemeId = watch('scheme_id');
  const watchedFundingSource = watch('funding_source') || 'Recycled Collections';
  const watchedRecycledSubType = watch('recycled_sub_type') || 'Fully Recycled';

  // Query suggested running group name from backend helper endpoint
  const { data: suggestion, isFetching: isSuggesting } = useSuggestGroupName(
    watchedLocation || '',
    isOpen && Boolean(watchedLocation?.trim()),
  );

  // Auto-fill group name when backend suggestion changes
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
      const isMixedRecycled =
        data.funding_source === 'Recycled Collections' &&
        data.recycled_sub_type === 'Recycled + Owner Investment';

      const createdGroup = await createGroup({
        location: data.location.trim(),
        scheme_id: data.scheme_id,
        group_name: data.group_name?.trim() || undefined,
        start_date: data.start_date || undefined,
        funding_source: data.funding_source || 'Recycled Collections',
        recycled_sub_type: data.funding_source === 'Recycled Collections'
          ? (data.recycled_sub_type || 'Fully Recycled')
          : undefined,
        owner_investment_amount: isMixedRecycled && data.owner_investment_amount
          ? Number(data.owner_investment_amount)
          : undefined,
        remarks: data.remarks?.trim() || undefined,
      });
      onSuccess?.(createdGroup);
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || 'An error occurred while creating the group.');
    }
  };

  // Find selected active scheme configuration for informational display
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
      <div className="w-full max-w-md my-8 rounded-xl bg-surface p-5 sm:p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-secondary-900">
          Create Finance Group
        </h2>

        {apiError && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 border border-error-200">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Location Input */}
          <Input
            id="group_location"
            label="Location *"
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
                'appearance-none',
                errors.scheme_id && 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
              )}
              disabled={isLoadingSchemes}
            >
              <option value="">Select scheme...</option>
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.scheme_name} ({formatMoney(s.loan_amount)} · {s.total_weeks} wks)
                </option>
              ))}
            </select>
            {errors.scheme_id && (
              <p className="text-xs text-error-600" role="alert">
                {errors.scheme_id.message}
              </p>
            )}
          </div>

          {/* Read-only Scheme Financial Details */}
          {selectedScheme && (
            <div className="rounded-lg bg-secondary-50 p-3 border border-border">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-secondary-400 block text-[10px] uppercase tracking-wider font-medium">Loan</span>
                  <span className="font-semibold text-secondary-900">{formatMoney(selectedScheme.loan_amount)}</span>
                </div>
                <div>
                  <span className="text-secondary-400 block text-[10px] uppercase tracking-wider font-medium">Installment</span>
                  <span className="font-semibold text-secondary-900">{formatMoney(selectedScheme.weekly_installment)}/wk</span>
                </div>
                <div>
                  <span className="text-secondary-400 block text-[10px] uppercase tracking-wider font-medium">Duration</span>
                  <span className="font-semibold text-secondary-900">{selectedScheme.total_weeks} Weeks</span>
                </div>
                <div>
                  <span className="text-secondary-400 block text-[10px] uppercase tracking-wider font-medium">Note Cost</span>
                  <span className="font-semibold text-secondary-900">{formatMoney(selectedScheme.note_cost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Group Name (Auto-suggested) */}
          <div className="relative">
            <Input
              id="group_name"
              label="Group Name *"
              placeholder="e.g. PTM 1"
              helperText={
                isSuggesting
                  ? 'Generating...'
                  : suggestion?.suggested_name
                    ? `Suggested: ${suggestion.suggested_name}`
                    : 'Auto-generated from location'
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
            label="Start Date *"
            required
            {...register('start_date', {
              required: 'Start date is required',
            })}
            errorMessage={errors.start_date?.message}
          />

          {/* Funding Source (Section 8) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="funding_source" className="text-sm font-medium text-secondary-900">
              Funding Source
            </label>
            <select
              id="funding_source"
              {...register('funding_source')}
              className={cn(
                'w-full h-10 px-3 rounded-lg border border-border bg-surface text-secondary-900 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
              )}
            >
              <option value="Recycled Collections">Recycled Collections (Default business cash)</option>
              <option value="Initial Investment">Initial Investment (Owner starting capital)</option>
              <option value="Additional Investment">Additional Investment (Owner capital added later)</option>
            </select>
            <p className="text-[11px] text-secondary-600 font-medium">
              Source of capital used to disburse this group&apos;s loans (Section 8).
            </p>
          </div>

          {/* Sub-options for Recycled Collections: Fully Recycled vs Recycled + Owner Investment */}
          {watchedFundingSource === 'Recycled Collections' && (
            <div className="rounded-xl border border-primary-200/80 bg-primary-50/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary-900 uppercase tracking-wider">
                  Recycled Funding Breakdown
                </span>
                <span className="text-[11px] font-medium text-primary-700 bg-primary-100/70 px-2 py-0.5 rounded">
                  Business Cash
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setValue('recycled_sub_type', 'Fully Recycled');
                    setValue('owner_investment_amount', 0);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs transition-all text-center',
                    watchedRecycledSubType === 'Fully Recycled'
                      ? 'border-primary-600 bg-surface text-primary-900 shadow-sm ring-1 ring-primary-500/30 font-semibold'
                      : 'border-border bg-surface/60 text-secondary-600 hover:bg-surface'
                  )}
                >
                  <span className="font-semibold">Fully Recycled</span>
                  <span className="text-[10px] text-secondary-500 mt-0.5">100% past collections</span>
                </button>

                <button
                  type="button"
                  onClick={() => setValue('recycled_sub_type', 'Recycled + Owner Investment')}
                  className={cn(
                    'flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs transition-all text-center',
                    watchedRecycledSubType === 'Recycled + Owner Investment'
                      ? 'border-primary-600 bg-surface text-primary-900 shadow-sm ring-1 ring-primary-500/30 font-semibold'
                      : 'border-border bg-surface/60 text-secondary-600 hover:bg-surface'
                  )}
                >
                  <span className="font-semibold">Recycled + Owner Cash</span>
                  <span className="text-[10px] text-secondary-500 mt-0.5">Collections + cash from hand</span>
                </button>
              </div>

              {/* Input for Owner Cash Added */}
              {watchedRecycledSubType === 'Recycled + Owner Investment' && (
                <div className="pt-2 border-t border-primary-200/60 space-y-1.5">
                  <Input
                    id="owner_investment_amount"
                    type="number"
                    label="Owner Cash Added (₹) *"
                    placeholder="e.g. 90,000"
                    helperText="Will automatically be credited to Owner Investments on the Profit page based on group start date."
                    {...register('owner_investment_amount', {
                      required:
                        watchedRecycledSubType === 'Recycled + Owner Investment'
                          ? 'Please enter the owner cash amount added'
                          : false,
                      min: { value: 1, message: 'Amount must be greater than 0' },
                      valueAsNumber: true,
                    })}
                    errorMessage={errors.owner_investment_amount?.message}
                  />
                </div>
              )}
            </div>
          )}

          {/* Remarks */}
          <Input
            id="group_remarks"
            label="Remarks (Optional)"
            placeholder="Operational notes..."
            {...register('remarks')}
            errorMessage={errors.remarks?.message}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isCreating}>
              Create Group
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
