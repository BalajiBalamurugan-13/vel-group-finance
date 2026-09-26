import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUpdateMember } from '../hooks/useMembers';
import type { Member, MemberUpdate } from '../types';
import type { ApiError } from '@/types/common';
import { cn } from '@/lib/cn';
import { X } from 'lucide-react';

interface UpdateMemberFormModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful update */
  onSuccess?: () => void;
}

export function UpdateMemberFormModal({
  member,
  isOpen,
  onClose,
  onSuccess,
}: UpdateMemberFormModalProps) {
  const { mutateAsync: updateMember, isPending: isUpdating } = useUpdateMember();
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MemberUpdate>({
    defaultValues: {
      member_name: member?.member_name || '',
      phone_number: member?.phone_number || '',
      address: member?.address || '',
      nominee: member?.nominee || '',
      id_proof: member?.id_proof || '',
      remarks: member?.remarks || '',
    },
  });

  useEffect(() => {
    if (member) {
      reset({
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
          member_name: data.member_name?.trim() || undefined,
          phone_number: data.phone_number?.trim() || undefined,
          address: data.address?.trim() || undefined,
          nominee: data.nominee?.trim() || undefined,
          id_proof: data.id_proof?.trim() || undefined,
          remarks: data.remarks?.trim() || undefined,
        },
      });
      onSuccess?.();
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
              Edit Member Profile
            </h2>
            <p className="text-xs text-secondary-500 mt-0.5">
              Group: <span className="font-medium text-secondary-800">{member.group_name || '—'}</span> · Financial terms are immutable
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="update_member_name"
              label="Member Name"
              placeholder="e.g. Murugan S"
              {...register('member_name', {
                required: 'Member name is required',
                maxLength: 255,
              })}
              errorMessage={errors.member_name?.message}
            />

            <Input
              id="update_member_phone"
              label="Phone Number"
              placeholder="e.g. 9876543210"
              maxLength={10}
              {...register('phone_number', {
                pattern: {
                  value: /^\d{10}$/,
                  message: 'Phone number must contain exactly 10 digits',
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
              Address <span className="text-error-500">*</span>
            </label>
            <textarea
              id="update_member_address"
              rows={2}
              placeholder="Street, Landmark, City/Village..."
              {...register('address', { required: 'Address is required' })}
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
              label="Nominee (Optional)"
              placeholder="e.g. Lakshmi M"
              {...register('nominee')}
            />

            <Input
              id="update_member_id_proof"
              label="ID Proof (Optional)"
              placeholder="e.g. Aadhaar / Voter ID"
              {...register('id_proof')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="update_member_remarks"
              className="text-sm font-medium text-secondary-700"
            >
              Remarks (Optional)
            </label>
            <textarea
              id="update_member_remarks"
              rows={2}
              placeholder="Additional notes..."
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
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isUpdating}
              className="min-h-[44px] flex-1 sm:flex-initial px-6 font-semibold"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
