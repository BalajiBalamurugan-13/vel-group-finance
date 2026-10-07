import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSchemes } from '@/features/schemes/hooks/useSchemes';
import { useCreateGroup, useSuggestGroupName, useLocations } from '../hooks/useGroups';
import type { GroupCreate } from '../types';
import type { ApiError } from '@/types/common';
import { cn } from '@/lib/cn';
import { Sparkles, X, CheckCircle2, MapPin, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the created group after successful creation */
  onSuccess?: (group: { group_name: string; group_code?: string | null }) => void;
}

export function GroupFormModal({ isOpen, onClose, onSuccess }: GroupFormModalProps) {
  const { data: schemes = [], isLoading: isLoadingSchemes } = useSchemes();
  const { data: existingLocations = [] } = useLocations();
  const { mutateAsync: createGroup, isPending: isCreating } = useCreateGroup();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationWrapperRef = useRef<HTMLDivElement>(null);

  // Close location autocomplete when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

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
      weekly_installment: 760,
      start_date: new Date().toISOString().split('T')[0],
      funding_source: 'Recycled Collections',
      recycled_sub_type: 'Fully Recycled',
      owner_investment_amount: 0,
      remarks: '',
    },
  });

  const watchedLocation = watch('location');
  const watchedSchemeId = watch('scheme_id');
  const watchedStartDate = watch('start_date');
  const watchedFundingSource = watch('funding_source') || 'Recycled Collections';
  const watchedRecycledSubType = watch('recycled_sub_type') || 'Fully Recycled';

  const collectionDayInfo = useMemo(() => {
    if (!watchedStartDate) return null;
    try {
      const [y, m, d] = watchedStartDate.split('-').map(Number);
      if (!y || !m || !d) return null;
      const day = new Date(y, m - 1, d).getDay();
      const daysTa = ['ஞாயிற்றுக்கிழமை', 'திங்கட்கிழமை', 'செவ்வாய்க்கிழமை', 'புதன்கிழமை', 'வியாழக்கிழமை', 'வெள்ளிக்கிழமை', 'சனிக்கிழமை'];
      const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return { nameTa: daysTa[day], nameEn: daysEn[day] };
    } catch {
      return null;
    }
  }, [watchedStartDate]);

  const filteredLocations = useMemo(() => {
    const term = (watchedLocation || '').toLowerCase().trim();
    if (!term) return existingLocations;
    return existingLocations.filter((loc) => loc.toLowerCase().includes(term));
  }, [existingLocations, watchedLocation]);

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

  // Find selected active scheme configuration for informational display
  const selectedScheme = schemes.find((s) => s.id === watchedSchemeId);

  // Pre-fill weekly installment when user selects a scheme
  useEffect(() => {
    if (selectedScheme?.weekly_installment) {
      setValue('weekly_installment', Number(selectedScheme.weekly_installment));
    }
  }, [selectedScheme, setValue]);

  const handleClose = () => {
    reset();
    setIsActive(true);
    setApiError(null);
    onClose();
  };

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

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
        weekly_installment: data.weekly_installment ? Number(data.weekly_installment) : undefined,
        start_date: data.start_date || undefined,
        funding_source: data.funding_source || 'Recycled Collections',
        recycled_sub_type: data.funding_source === 'Recycled Collections'
          ? (data.recycled_sub_type || 'Fully Recycled')
          : undefined,
        owner_investment_amount: isMixedRecycled && data.owner_investment_amount
          ? Number(data.owner_investment_amount)
          : undefined,
        status: isActive ? 'Active' : 'Draft',
        remarks: data.remarks?.trim() || undefined,
      });
      onSuccess?.(createdGroup);
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || 'An error occurred while creating the group.');
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-secondary-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-group-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border border-border max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Pinned Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 flex-shrink-0 bg-surface">
          <div>
            <h2 id="create-group-title" className="text-base sm:text-lg font-bold text-secondary-900">
              Create Finance Group
            </h2>
            <p className="text-xs text-secondary-500 mt-0.5">
              Set up a new borrowing group and financial scheme
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form wrapping body and pinned footer */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {apiError && (
              <div className="rounded-lg bg-error-50 p-3 text-sm text-error-600 border border-error-200">
                {apiError}
              </div>
            )}

          {/* Group Status Toggle (Default ON: Active) — Prominent at Top */}
          <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-primary-200/90 bg-primary-50/50 shadow-2xs">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-success-100 text-success-700'
                    : 'bg-secondary-200 text-secondary-600'
                )}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-secondary-900">Group Status:</span>
                  <Badge variant={isActive ? 'success' : 'neutral'}>
                    {isActive ? 'Active (Direct)' : 'Draft (Inactive)'}
                  </Badge>
                </div>
                <p className="text-[11px] text-secondary-500 mt-0.5">
                  {isActive
                    ? 'Immediately ready for member enrollment and collections.'
                    : 'Saved as draft. Requires manual activation before recording collections.'}
                </p>
              </div>
            </div>

            {/* Accessible Toggle Button */}
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              aria-label="Toggle group active status"
              onClick={() => setIsActive(!isActive)}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                isActive ? 'bg-primary-600' : 'bg-secondary-300'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                  isActive ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Location Input with Autocomplete Suggestions */}
          <div ref={locationWrapperRef} className="relative z-30">
            <Input
              id="group_location"
              label="Location *"
              placeholder="e.g. PTM, TNK, ABC"
              autoComplete="off"
              {...register('location', {
                required: 'Location is required',
                maxLength: 100,
              })}
              onFocus={() => setIsLocationDropdownOpen(true)}
              onClick={() => setIsLocationDropdownOpen(true)}
              rightElement={
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Toggle location suggestions"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsLocationDropdownOpen((prev) => !prev);
                  }}
                  className="p-1 hover:text-secondary-700 text-secondary-400 transition-colors focus:outline-none"
                >
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      isLocationDropdownOpen && 'rotate-180 text-primary-600'
                    )}
                  />
                </button>
              }
              errorMessage={errors.location?.message}
            />

            {/* Interactive Suggestions Popover */}
            {isLocationDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-52 overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl py-1 text-sm animate-in fade-in-50 zoom-in-95 duration-100">
                {filteredLocations.length > 0 ? (
                  <>
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary-400 border-b border-border/60 flex items-center justify-between">
                      <span>Existing Locations ({filteredLocations.length})</span>
                      <span className="text-[10px] lowercase font-normal text-secondary-400">click to pick</span>
                    </div>
                    {filteredLocations.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // keep input focused
                          setValue('location', loc, { shouldValidate: true });
                          setIsLocationDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-primary-50 hover:text-primary-900 transition-colors flex items-center gap-2 text-secondary-800"
                      >
                        <MapPin className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
                        <span className="font-medium">{loc}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="px-3 py-2.5 text-xs text-secondary-500">
                    New location: <span className="font-semibold text-secondary-800">"{watchedLocation}"</span> (will be saved with this group)
                  </div>
                )}
              </div>
            )}
          </div>

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

          {/* Read-only Scheme Financial Details & Editable Weekly Installment */}
          {selectedScheme && (
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary-50 p-3 border border-border">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-secondary-400 block text-[10px] uppercase tracking-wider font-medium">Loan</span>
                    <span className="font-semibold text-secondary-900">{formatMoney(selectedScheme.loan_amount)}</span>
                  </div>
                  <div>
                    <span className="text-secondary-400 block text-[10px] uppercase tracking-wider font-medium">Scheme Default</span>
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

              {/* Configurable Per-Group Weekly Installment */}
              <Input
                id="group_weekly_installment"
                type="number"
                step="any"
                min="1"
                label="Weekly Installment (₹) *"
                placeholder="760"
                helperText={`Default is ₹${selectedScheme.weekly_installment}/wk. If members pay ₹1000/wk to close early, enter 1000 here.`}
                {...register('weekly_installment', {
                  required: 'Weekly installment is required',
                  min: { value: 1, message: 'Must be greater than 0' },
                })}
                errorMessage={errors.weekly_installment?.message}
              />
            </div>
          )}

          {/* Group Name (Auto-suggested) */}
          <div>
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
          <div>
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
            {collectionDayInfo && (
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-200">
                <span>📅</span>
                <span>
                  வசூல் நாள் (Collection Day): {collectionDayInfo.nameTa} ({collectionDayInfo.nameEn})
                </span>
              </div>
            )}
          </div>

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
          </div>

          {/* Pinned Footer with safe-area spacing */}
          <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border bg-surface flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="min-h-[44px] px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isCreating}
              className="min-h-[44px] flex-1 sm:flex-initial px-6 font-semibold"
            >
              {isActive ? 'Create Active Group' : 'Save as Draft'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
