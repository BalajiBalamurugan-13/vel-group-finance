import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUpdateGroup } from '../hooks/useGroups';
import type { Group, GroupUpdate } from '../types';
import type { ApiError } from '@/types/common';

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
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupUpdate>();

  useEffect(() => {
    if (group) {
      reset({
        group_name: group.group_name,
        location: group.location,
        start_date: group.start_date || '',
        remarks: group.remarks || '',
      });
    }
  }, [group, reset]);

  if (!isOpen || !group) return null;

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: GroupUpdate) => {
    setApiError(null);
    try {
      await updateGroup({
        id: group.id,
        payload: {
          group_name: data.group_name?.trim() || undefined,
          location: data.location?.trim() || undefined,
          start_date: data.start_date || undefined,
          remarks: data.remarks?.trim() || undefined,
        },
      });
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || 'An error occurred while updating the group.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md my-8 rounded-xl bg-surface p-5 sm:p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-secondary-900">
          Edit Group
        </h2>

        {apiError && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 border border-error-200">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="edit_group_name"
            label="Group Name *"
            {...register('group_name', {
              required: 'Group name is required',
              maxLength: 255,
            })}
            errorMessage={errors.group_name?.message}
          />

          <Input
            id="edit_location"
            label="Location *"
            {...register('location', {
              required: 'Location is required',
              maxLength: 100,
            })}
            errorMessage={errors.location?.message}
          />

          {/* Scheme (Immutable) */}
          <div className="rounded-lg bg-secondary-50 p-3 text-xs text-secondary-500 border border-border">
            <span className="font-semibold text-secondary-800 block">
              Scheme: {group.scheme?.scheme_name || 'N/A'}
            </span>
            <span className="text-[11px]">
              Cannot be changed after group creation.
            </span>
          </div>

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

          <Input
            id="edit_remarks"
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
    </div>
  );
}
