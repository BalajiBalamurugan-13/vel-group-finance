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
import { useUpdateMember } from '../hooks/useMembers';
import { useLanguage } from '@/i18n';
import type { Member, MemberUpdate } from '../types';
import type { ApiError } from '@/types/common';
import { cn } from '@/lib/cn';
import { X, ArrowRightLeft } from 'lucide-react';

interface UpdateMemberFormModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful update with member name */
  onSuccess?: (memberName: string) => void;
}

export function UpdateMemberFormModal({
  member,
  isOpen,
  onClose,
  onSuccess,
}: UpdateMemberFormModalProps) {
  const { language } = useLanguage();
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups();
  const { places } = usePlacesRoute();
  const { mutateAsync: updateMember, isPending: isUpdating } = useUpdateMember();
  const [apiError, setApiError] = useState<string | null>(null);

  // Eligible groups: Draft, Active, or the member's current group
  const eligibleGroups = useMemo(() => {
    const raw = groups.filter(
      (g) => g.status === 'Draft' || g.status === 'Active' || g.id === member?.group_id
    );
    return sortGroupsByRoute(raw, places);
  }, [groups, places, member?.group_id]);

  const routeOptgroups = useMemo(() => {
    return buildRouteGroupOptgroups(eligibleGroups, places);
  }, [eligibleGroups, places]);

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
    reset,
    formState: { errors },
  } = useForm<MemberUpdate>({
    defaultValues: {
      group_id: member?.group_id || '',
      member_name: member?.member_name || '',
      phone_number: member?.phone_number || '',
      address: member?.address || '',
      nominee: member?.nominee || '',
      id_proof: member?.id_proof || '',
      remarks: member?.remarks || '',
    },
  });

  const watchedGroupId = watch('group_id');

  useEffect(() => {
    if (member) {
      reset({
        group_id: member.group_id || '',
        member_name: member.member_name || '',
        phone_number: member.phone_number || '',
        address: member.address || '',
        nominee: member.nominee || '',
        id_proof: member.id_proof || '',
        remarks: member.remarks || '',
      });
      setApiError(null);
    }
  }, [member, reset]);

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

  if (!isOpen || !member) return null;

  const onSubmit = async (data: MemberUpdate) => {
    setApiError(null);
    try {
      await updateMember({
        id: member.id,
        payload: {
          group_id: data.group_id && data.group_id !== member.group_id ? data.group_id : undefined,
          member_name: data.member_name?.trim() || undefined,
          phone_number: data.phone_number?.trim() || undefined,
          address: data.address?.trim() || undefined,
          nominee: data.nominee?.trim() || undefined,
          id_proof: data.id_proof?.trim() || undefined,
          remarks: data.remarks?.trim() || undefined,
        },
      });
      const savedName = data.member_name?.trim() || member.member_name;
      onSuccess?.(savedName);
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(
        apiErr.message || 'An error occurred while updating member profile.',
      );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-secondary-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-member-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border border-border max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Pinned Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 flex-shrink-0 bg-surface">
          <div>
            <h2 id="edit-member-title" className="text-base sm:text-lg font-bold text-secondary-900">
              {language === 'ta' ? 'உறுப்பினர் விவரங்களைத் திருத்து' : 'Edit Member Details'}
            </h2>
            <p className="text-xs text-secondary-500 mt-0.5">
              {language === 'ta' ? 'தற்போதைய குழு:' : 'Current Group:'}{' '}
              <span className="font-semibold text-secondary-800">{member.group_name || '—'}</span>
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

            {/* Group Assignment / Reassignment */}
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-secondary-50/70 border border-secondary-200">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="update_member_group_id"
                  className="text-xs font-semibold text-secondary-800 flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-primary-600" />
                  {language === 'ta' ? 'குழு ஒதுக்கீடு / மாற்றம்' : 'Group Assignment / Transfer'}
                  <span className="text-error-500">*</span>
                </label>
                {watchedGroupId && watchedGroupId !== member.group_id && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    {language === 'ta' ? 'குழு மாற்றப்படும்' : 'Transferring'}
                  </span>
                )}
              </div>
              <select
                id="update_member_group_id"
                {...register('group_id', {
                  required: language === 'ta' ? 'குழுவை தேர்ந்தெடுக்கவும்' : 'Please select a group',
                })}
                className={cn(
                  'h-10 min-h-[40px] w-full rounded-lg border border-border bg-surface px-3 text-sm text-secondary-900',
                  'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                  errors.group_id &&
                    'border-error-500 focus:border-error-500 focus:ring-error-500/20',
                )}
                disabled={isLoadingGroups}
              >
                <option value="">
                  {language === 'ta' ? '-- குழுவை தேர்ந்தெடுக்கவும் --' : '-- Select Group --'}
                </option>
                {routeOptgroups.map((og) => (
                  <optgroup key={og.label} label={og.label}>
                    {og.options.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.group_name} ({g.location}){g.id === member.group_id ? ` — [${language === 'ta' ? 'தற்போதைய குழு' : 'Current'}]` : ''}
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
              {watchedGroupId && watchedGroupId !== member.group_id ? (
                <p className="text-xs text-amber-700 font-medium">
                  {language === 'ta'
                    ? '⚠️ இந்த உறுப்பினரை புதிய குழுவிற்கு மாற்றினால், முந்தைய குழுவிலிருந்து நீக்கப்பட்டு புதிய குழுவில் சேர்க்கப்படுவார்.'
                    : '⚠️ Transferring will move this member and all cycle records from the current group to the selected group.'}
                </p>
              ) : (
                <p className="text-[11px] text-secondary-500">
                  {language === 'ta'
                    ? 'தவறான குழுவில் சேர்க்கப்பட்ட உறுப்பினர்களை சரியான குழுவிற்கு மாற்ற இந்த தேர்வைப் பயன்படுத்தலாம்.'
                    : 'Use this to move members who were accidentally added to the wrong group.'}
                </p>
              )}
            </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="update_member_name"
              label={language === 'ta' ? 'உறுப்பினர் பெயர் *' : 'Member Name *'}
              placeholder={language === 'ta' ? 'உ.ம். முருகன்' : 'e.g. Murugan S'}
              {...register('member_name', {
                required: language === 'ta' ? 'உறுப்பினர் பெயர் தேவை' : 'Member name is required',
                maxLength: 255,
              })}
              errorMessage={errors.member_name?.message}
            />

            <Input
              id="update_member_phone"
              label={language === 'ta' ? 'தொலைபேசி எண் *' : 'Phone Number *'}
              placeholder="e.g. 9876543210"
              maxLength={10}
              {...register('phone_number', {
                pattern: {
                  value: /^\d{10}$/,
                  message: language === 'ta' ? 'தொலைபேசி எண் 10 இலக்கங்களைக் கொண்டிருக்க வேண்டும்' : 'Phone number must contain exactly 10 digits',
                },
              })}
              errorMessage={errors.phone_number?.message}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="update_member_address"
              className="text-sm font-medium text-secondary-700"
            >
              {language === 'ta' ? 'முகவரி' : 'Address'} <span className="text-error-500">*</span>
            </label>
            <textarea
              id="update_member_address"
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="update_member_nominee"
              label={language === 'ta' ? 'நாமினி (விருப்பத்தேர்வு)' : 'Nominee (Optional)'}
              placeholder={language === 'ta' ? 'உ.ம். லட்சுமி' : 'e.g. Lakshmi M'}
              {...register('nominee')}
            />

            <Input
              id="update_member_id_proof"
              label={language === 'ta' ? 'அடையாளச் சான்று (விருப்பத்தேர்வு)' : 'ID Proof (Optional)'}
              placeholder={language === 'ta' ? 'ஆதார் / வாக்காளர் அட்டை' : 'e.g. Aadhaar / Voter ID'}
              {...register('id_proof')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="update_member_remarks"
              className="text-sm font-medium text-secondary-700"
            >
              {language === 'ta' ? 'குறிப்புகள் (விருப்பத்தேர்வு)' : 'Remarks (Optional)'}
            </label>
            <textarea
              id="update_member_remarks"
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
              disabled={isUpdating}
              className="min-h-[44px] px-4"
            >
              {language === 'ta' ? 'ரத்து' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isUpdating}
              className="min-h-[44px] flex-1 sm:flex-initial px-6 font-semibold"
            >
              {language === 'ta' ? 'மாற்றங்களை சேமி' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
