import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { X, MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUpdateGroup, useLocations } from '../hooks/useGroups';
import type { Group, GroupUpdate } from '../types';
import type { ApiError } from '@/types/common';
import { cn } from '@/lib/cn';

interface UpdateGroupFormModalProps {
  group: Group | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateGroupFormModal({
  group,
  isOpen,
  onClose,
}: UpdateGroupFormModalProps) {
  const { mutateAsync: updateGroup, isPending } = useUpdateGroup();
  const { data: existingLocations = [] } = useLocations();
  const [apiError, setApiError] = useState<string | null>(null);
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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<GroupUpdate>();

  const watchedLocation = watch('location');
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

  useEffect(() => {
    if (group) {
      reset({
        group_name: group.group_name,
        location: group.location,
        weekly_installment: group.weekly_installment || group.scheme?.weekly_installment || 760,
        start_date: group.start_date || '',
        funding_source: group.funding_source || 'Recycled Collections',
        recycled_sub_type: group.recycled_sub_type || 'Fully Recycled',
        owner_investment_amount: group.owner_investment_amount || 0,
        remarks: group.remarks || '',
      });
    }
  }, [group, reset]);

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

  if (!isOpen || !group) return null;

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: GroupUpdate) => {
    setApiError(null);
    try {
      const isMixedRecycled =
        data.funding_source === 'Recycled Collections' &&
        data.recycled_sub_type === 'Recycled + Owner Investment';

      await updateGroup({
        id: group.id,
        payload: {
          group_name: data.group_name?.trim() || undefined,
          location: data.location?.trim() || undefined,
          weekly_installment: data.weekly_installment ? Number(data.weekly_installment) : undefined,
          start_date: data.start_date || undefined,
          funding_source: data.funding_source || undefined,
          recycled_sub_type: data.funding_source === 'Recycled Collections'
            ? (data.recycled_sub_type || 'Fully Recycled')
            : undefined,
          owner_investment_amount: isMixedRecycled && data.owner_investment_amount
            ? Number(data.owner_investment_amount)
            : 0,
          remarks: data.remarks?.trim() || undefined,
        },
      });
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || 'An error occurred while updating the group.');
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
              Edit Group
            </h2>
            <p className="text-xs text-secondary-500 mt-0.5">
              Update group details and funding breakdown
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

            <Input
              id="edit_group_name"
              label="Group Name *"
              {...register('group_name', {
                required: 'Group name is required',
                maxLength: 255,
              })}
              errorMessage={errors.group_name?.message}
            />

            {/* Location Input with Autocomplete Suggestions */}
            <div ref={locationWrapperRef} className="relative z-30">
              <Input
                id="edit_location"
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
                            e.preventDefault();
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

            {/* Scheme (Immutable) & Editable Weekly Installment */}
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary-50 p-3 text-xs text-secondary-500 border border-border">
                <span className="font-semibold text-secondary-800 block">
                  Scheme: {group.scheme?.scheme_name || 'N/A'} (Default: ₹{group.scheme?.weekly_installment || 760}/wk)
                </span>
                <span className="text-[11px]">
                  Scheme cannot be changed after group creation.
                </span>
              </div>

              {/* Configurable Weekly Installment */}
              <Input
                id="edit_weekly_installment"
                type="number"
                step="any"
                min="1"
                label="Weekly Installment (₹) *"
                placeholder="760"
                helperText={`Change if this group pays ₹1000/wk or another amount instead of scheme default (₹${group.scheme?.weekly_installment || 760}/wk).`}
                {...register('weekly_installment', {
                  required: 'Weekly installment is required',
                  min: { value: 1, message: 'Must be greater than 0' },
                })}
                errorMessage={errors.weekly_installment?.message}
              />
            </div>

            <div>
              <Input
                id="edit_start_date"
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
              <label htmlFor="edit_funding_source" className="text-sm font-medium text-secondary-900">
                Funding Source
              </label>
              <select
                id="edit_funding_source"
                {...register('funding_source')}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-secondary-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="Recycled Collections">Recycled Collections</option>
                <option value="Initial Investment">Initial Investment</option>
                <option value="Additional Investment">Additional Investment</option>
              </select>
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
                      id="edit_owner_investment_amount"
                      type="number"
                      label="Owner Cash Added (₹) *"
                      placeholder="e.g. 90,000"
                      helperText="Owner cash added from hand for this group."
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

            <Input
              id="edit_remarks"
              label="Remarks (Optional)"
              placeholder="Operational notes..."
              {...register('remarks')}
              errorMessage={errors.remarks?.message}
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
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
