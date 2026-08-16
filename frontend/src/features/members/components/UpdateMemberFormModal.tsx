import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUpdateMember } from '../hooks/useMembers';
import type { Member, MemberUpdate } from '../types';
import type { ApiError } from '@/types/common';
import { cn } from '@/lib/cn';

interface UpdateMemberFormModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateMemberFormModal({
  member,
  isOpen,
  onClose,
}: UpdateMemberFormModalProps) {
  const { mutateAsync: updateMember, isPending: isUpdating } = useUpdateMember();
  const [apiError, setApiError] = useState<string | null>(null);

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

  if (!isOpen || !member) return null;

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

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
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(
        apiErr.message || 'An error occurred while updating member profile.',
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg my-8 rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="mb-1 text-xl font-semibold text-secondary-900">
          Edit Member Profile
        </h2>
        <p className="mb-4 text-xs text-secondary-500">
          Group: <span className="font-medium text-secondary-800">{member.group_name || '—'}</span> · Group and financial configuration are immutable.
        </p>

        {apiError && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {...register('phone_number', {
                required: 'Phone number is required',
                minLength: {
                  value: 5,
                  message: 'Phone number must have at least 5 digits',
                },
                maxLength: 20,
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

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
