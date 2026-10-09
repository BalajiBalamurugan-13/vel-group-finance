import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useGroups } from '@/features/groups/hooks/useGroups';
import {
  usePlacesRoute,
  sortGroupsByRoute,
  buildRouteGroupOptgroups,
} from '@/features/places';
import { useCreateMember } from '../hooks/useMembers';
import { formatCurrency } from '@/utils/format';
import { useLanguage } from '@/i18n';
import type { MemberCreate } from '../types';
import type { ApiError } from '@/types/common';
import { cn } from '@/lib/cn';
import { Info, X } from 'lucide-react';

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroupId?: string;
  /** Called with the created member name after successful creation */
  onSuccess?: (memberName: string) => void;
}

export function MemberFormModal({
  isOpen,
  onClose,
  defaultGroupId,
  onSuccess,
}: MemberFormModalProps) {
  const { language } = useLanguage();
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups();
  const { places } = usePlacesRoute();
  const { mutateAsync: createMember, isPending: isCreating } = useCreateMember();
  const [apiError, setApiError] = useState<string | null>(null);

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

  // Available groups for enrollment: Draft and Active groups only, sorted strictly by configured route
  const eligibleGroups = useMemo(() => {
    const raw = groups.filter((g) => g.status === 'Draft' || g.status === 'Active');
    return sortGroupsByRoute(raw, places);
  }, [groups, places]);

  // Structured optgroups by place and session
  const routeOptgroups = useMemo(() => {
    return buildRouteGroupOptgroups(eligibleGroups, places);
  }, [eligibleGroups, places]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<MemberCreate>({
    defaultValues: {
      group_id: defaultGroupId || '',
      member_name: '',
      phone_number: '',
      address: '',
      joined_date: new Date().toISOString().split('T')[0],
      nominee: '',
      id_proof: '',
      remarks: '',
    },
  });

  const watchedGroupId = watch('group_id');
  const selectedGroup = groups.find((g) => g.id === watchedGroupId);

  const handleClose = () => {
    reset();
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

  const onSubmit = async (data: MemberCreate) => {
    setApiError(null);
    try {
      const createdMember = await createMember({
        group_id: data.group_id,
        member_name: data.member_name.trim(),
        phone_number: data.phone_number.trim(),
        address: data.address.trim(),
        joined_date: data.joined_date || undefined,
        nominee: data.nominee?.trim() || undefined,
        id_proof: data.id_proof?.trim() || undefined,
        remarks: data.remarks?.trim() || undefined,
      });
      onSuccess?.(createdMember.member_name);
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(
        apiErr.message || 'An error occurred while adding the member.',
      );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-secondary-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border border-border max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Pinned Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 flex-shrink-0 bg-surface">
          <div>
            <h2 id="add-member-title" className="text-base sm:text-lg font-bold text-secondary-900">
              {language === 'ta' ? 'புதிய உறுப்பினரைச் சேர்' : 'Add New Member'}
            </h2>
            <p className="text-xs text-secondary-500 mt-0.5">
              {language === 'ta'
                ? 'செயலில் உள்ள குழுவில் உறுப்பினரைச் சேர்க்கவும்'
                : 'Enroll member into an active finance group'}
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

            {eligibleGroups.length === 0 && !isLoadingGroups && (
              <div className="rounded-lg bg-warning-50 p-3 text-sm text-warning-800 border border-warning-200">
                <strong>{language === 'ta' ? 'குறிப்பு:' : 'Note:'}</strong>{' '}
                {language === 'ta'
                  ? 'தற்போது செயலில் உள்ள குழுக்கள் எதுவும் இல்லை. செயலில் உள்ள குழுவில் மட்டுமே உறுப்பினர்களைச் சேர்க்க முடியும். முதலில் ஒரு குழுவை செயல்படுத்தவும்.'
                  : 'No Active groups are currently available. Members can only be added to an Active group. Please activate a group first.'}
              </div>
            )}
          {/* Group Selection */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="member_group_id"
              className="text-sm font-medium text-secondary-700"
            >
              {language === 'ta' ? 'செயலில் உள்ள குழுவை ஒதுக்கு' : 'Assign to Active Group'}{' '}
              <span className="text-error-500">*</span>
            </label>
            <select
              id="member_group_id"
              {...register('group_id', {
                required: language === 'ta' ? 'செயலில் உள்ள குழுவை தேர்ந்தெடுக்கவும்' : 'Please select an active group',
              })}
              className={cn(
                'h-11 min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 text-sm text-secondary-900',
                'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                errors.group_id &&
                  'border-error-500 focus:border-error-500 focus:ring-error-500/20',
              )}
              disabled={isLoadingGroups}
            >
              <option value="">
                {language === 'ta' ? '-- குழுவை தேர்ந்தெடுக்கவும் --' : '-- Select Active Group --'}
              </option>
              {routeOptgroups.map((og) => (
                <optgroup key={og.label} label={og.label}>
                  {og.options.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name} ({g.location})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.group_id && (
              <p className="text-xs text-error-500">
                {errors.group_id.message}
              </p>
            )}
          </div>

          {/* Read-Only Scheme Preview for Selected Group */}
          {selectedGroup?.scheme && (
            <div className="rounded-lg border border-primary-100 bg-primary-50/60 p-3 text-xs text-secondary-700">
              <div className="flex items-center gap-1.5 font-semibold text-primary-900 mb-1.5">
                <Info className="h-4 w-4 text-primary-600" />
                {language === 'ta' ? 'திட்டம்:' : 'Scheme:'} {selectedGroup.scheme.scheme_name}
              </div>
              <div className="grid grid-cols-2 gap-2 text-secondary-600">
                <div>
                  {language === 'ta' ? 'கடன் தொகை:' : 'Loan Amount:'}{' '}
                  <span className="font-medium text-secondary-900">
                    {formatCurrency(Number(selectedGroup.scheme.loan_amount))}
                  </span>
                </div>
                <div>
                  {language === 'ta' ? 'வார தவணை:' : 'Weekly Installment:'}{' '}
                  <span className="font-medium text-secondary-900">
                    {formatCurrency(
                      Number(selectedGroup.scheme.weekly_installment),
                    )}
                  </span>
                </div>
                <div>
                  {language === 'ta' ? 'நோட்டு செலவு:' : 'Note Cost:'}{' '}
                  <span className="font-medium text-secondary-900">
                    {formatCurrency(Number(selectedGroup.scheme.note_cost || 0))}
                  </span>
                </div>
                <div>
                  {language === 'ta' ? 'வழங்கப்பட்ட பணம்:' : 'Cash Given:'}{' '}
                  <span className="font-semibold text-success-700">
                    {formatCurrency(
                      Number(selectedGroup.scheme.loan_amount) -
                        Number(selectedGroup.scheme.note_cost || 0),
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Name & Phone */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="member_name"
              label={language === 'ta' ? 'உறுப்பினர் பெயர் *' : 'Member Name *'}
              placeholder={language === 'ta' ? 'உ.ம். முருகன்' : 'e.g. Murugan S'}
              {...register('member_name', {
                required: language === 'ta' ? 'உறுப்பினர் பெயர் தேவை' : 'Member name is required',
                maxLength: 255,
              })}
              errorMessage={errors.member_name?.message}
            />

            <Input
              id="member_phone"
              label={language === 'ta' ? 'தொலைபேசி எண் *' : 'Phone Number *'}
              placeholder="e.g. 9876543210"
              maxLength={10}
              {...register('phone_number', {
                required: language === 'ta' ? 'தொலைபேசி எண் தேவை' : 'Phone number is required',
                pattern: {
                  value: /^\d{10}$/,
                  message: language === 'ta' ? 'தொலைபேசி எண் 10 இலக்கங்களைக் கொண்டிருக்க வேண்டும்' : 'Phone number must contain exactly 10 digits',
                },
              })}
              errorMessage={errors.phone_number?.message}
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="member_address"
              className="text-sm font-medium text-secondary-700"
            >
              {language === 'ta' ? 'முகவரி' : 'Address'} <span className="text-error-500">*</span>
            </label>
            <textarea
              id="member_address"
              rows={2}
              placeholder={language === 'ta' ? 'தெரு, ஊர், அடையாளம்...' : 'Street, Landmark, City/Village...'}
              {...register('address', {
                required: language === 'ta' ? 'முகவரி தேவை' : 'Address is required',
              })}
              className={cn(
                'w-full rounded-lg border border-border bg-surface p-3 text-sm text-secondary-900 placeholder:text-secondary-400',
                'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                errors.address &&
                  'border-error-500 focus:border-error-500 focus:ring-error-500/20',
              )}
            />
            {errors.address && (
              <p className="text-xs text-error-500">
                {errors.address.message}
              </p>
            )}
          </div>

          {/* Joined Date */}
          <Input
            id="member_joined_date"
            label={language === 'ta' ? 'சேர்ந்த தேதி' : 'Joined Date'}
            type="date"
            {...register('joined_date')}
            errorMessage={errors.joined_date?.message}
          />

          {/* Nominee & ID Proof */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="member_nominee"
              label={language === 'ta' ? 'நாமினி (விருப்பத்தேர்வு)' : 'Nominee (Optional)'}
              placeholder={language === 'ta' ? 'உ.ம். லட்சுமி (மனைவி)' : 'e.g. Lakshmi M (Spouse)'}
              {...register('nominee')}
            />

            <Input
              id="member_id_proof"
              label={language === 'ta' ? 'அடையாளச் சான்று (விருப்பத்தேர்வு)' : 'ID Proof (Optional)'}
              placeholder={language === 'ta' ? 'ஆதார் / வாக்காளர் அட்டை' : 'e.g. Aadhaar / Voter ID'}
              {...register('id_proof')}
            />
          </div>

          {/* Remarks */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="member_remarks"
              className="text-sm font-medium text-secondary-700"
            >
              {language === 'ta' ? 'குறிப்புகள் (விருப்பத்தேர்வு)' : 'Remarks (Optional)'}
            </label>
            <textarea
              id="member_remarks"
              rows={2}
              placeholder={language === 'ta' ? 'கூடுதல் குறிப்புகள்...' : 'Additional notes...'}
              {...register('remarks')}
              className={cn(
                'w-full rounded-lg border border-border bg-surface p-3 text-sm text-secondary-900 placeholder:text-secondary-400',
                'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              )}
            />
          </div>

          </div>

          {/* Pinned Footer with safe-area spacing */}
          <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border bg-surface flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              className="min-h-[44px] px-4"
            >
              {language === 'ta' ? 'ரத்து' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isCreating}
              className="min-h-[44px] flex-1 sm:flex-initial px-6 font-semibold"
            >
              {language === 'ta' ? 'உறுப்பினரைச் சேர்' : 'Add Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
