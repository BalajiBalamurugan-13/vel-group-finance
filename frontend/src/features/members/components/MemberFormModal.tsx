import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useCreateMember } from '../hooks/useMembers';
import { formatCurrency } from '@/utils/format';
import type { MemberCreate } from '../types';
import type { ApiError } from '@/types/common';
import { cn } from '@/lib/cn';
import { Info } from 'lucide-react';

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
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups();
  const { mutateAsync: createMember, isPending: isCreating } = useCreateMember();
  const [apiError, setApiError] = useState<string | null>(null);

  // Available groups for enrollment: Draft and Active groups only.
  // Draft groups accept members but do not disburse loans until activated (BR-025, BR-026).
  const eligibleGroups = groups.filter((g) => g.status === 'Draft' || g.status === 'Active');

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

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg my-8 rounded-xl bg-surface p-4 sm:p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-secondary-900">
          Add New Member
        </h2>

        {apiError && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600">
            {apiError}
          </div>
        )}

        {eligibleGroups.length === 0 && !isLoadingGroups && (
          <div className="mb-4 rounded-lg bg-warning-50 p-3 text-sm text-warning-800 border border-warning-200">
            <strong>Note:</strong> No Active groups are currently available. Members can only be added to an Active group. Please activate a group first.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Group Selection */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="member_group_id"
              className="text-sm font-medium text-secondary-700"
            >
              Assign to Active Group <span className="text-error-500">*</span>
            </label>
            <select
              id="member_group_id"
              {...register('group_id', { required: 'Please select an active group' })}
              className={cn(
                'h-11 min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 text-sm text-secondary-900',
                'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                errors.group_id &&
                  'border-error-500 focus:border-error-500 focus:ring-error-500/20',
              )}
              disabled={isLoadingGroups}
            >
              <option value="">-- Select Active Group --</option>
              {eligibleGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name} ({g.location})
                </option>
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
                Scheme: {selectedGroup.scheme.scheme_name}
              </div>
              <div className="grid grid-cols-2 gap-2 text-secondary-600">
                <div>
                  Loan Amount:{' '}
                  <span className="font-medium text-secondary-900">
                    {formatCurrency(Number(selectedGroup.scheme.loan_amount))}
                  </span>
                </div>
                <div>
                  Weekly Installment:{' '}
                  <span className="font-medium text-secondary-900">
                    {formatCurrency(
                      Number(selectedGroup.scheme.weekly_installment),
                    )}
                  </span>
                </div>
                <div>
                  Note Cost:{' '}
                  <span className="font-medium text-secondary-900">
                    {formatCurrency(Number(selectedGroup.scheme.note_cost || 0))}
                  </span>
                </div>
                <div>
                  Cash Given:{' '}
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
              label="Member Name"
              placeholder="e.g. Murugan S"
              {...register('member_name', {
                required: 'Member name is required',
                maxLength: 255,
              })}
              errorMessage={errors.member_name?.message}
            />

            <Input
              id="member_phone"
              label="Phone Number"
              placeholder="e.g. 9876543210"
              maxLength={10}
              {...register('phone_number', {
                required: 'Phone number is required',
                pattern: {
                  value: /^\d{10}$/,
                  message: 'Phone number must contain exactly 10 digits',
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
              Address <span className="text-error-500">*</span>
            </label>
            <textarea
              id="member_address"
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

          {/* Joined Date */}
          <Input
            id="member_joined_date"
            label="Joined Date"
            type="date"
            {...register('joined_date')}
            errorMessage={errors.joined_date?.message}
          />

          {/* Nominee & ID Proof */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="member_nominee"
              label="Nominee (Optional)"
              placeholder="e.g. Lakshmi M (Spouse)"
              {...register('nominee')}
            />

            <Input
              id="member_id_proof"
              label="ID Proof (Optional)"
              placeholder="e.g. Aadhaar / Voter ID"
              {...register('id_proof')}
            />
          </div>

          {/* Remarks */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="member_remarks"
              className="text-sm font-medium text-secondary-700"
            >
              Remarks (Optional)
            </label>
            <textarea
              id="member_remarks"
              rows={2}
              placeholder="Additional notes..."
              {...register('remarks')}
              className={cn(
                'w-full rounded-lg border border-border bg-surface p-3 text-sm text-secondary-900 placeholder:text-secondary-400',
                'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              )}
            />
          </div>

          {/* Buttons */}
          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Add Member
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
