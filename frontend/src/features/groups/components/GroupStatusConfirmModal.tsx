import { Button } from '@/components/ui/Button';
import type { Group, GroupStatus } from '../types';

interface GroupStatusConfirmModalProps {
  group: Group | null;
  targetStatus: GroupStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (group: Group, newStatus: GroupStatus) => Promise<void>;
  isLoading: boolean;
}

export function GroupStatusConfirmModal({
  group,
  targetStatus,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: GroupStatusConfirmModalProps) {
  if (!isOpen || !group || !targetStatus) return null;

  const getModalConfig = () => {
    switch (targetStatus) {
      case 'Active':
        return {
          title: `Activate Group — ${group.group_name}`,
          description:
            'Activating this group will automatically disburse loans to all members currently in Draft and begin weekly collection workflows. This action cannot be reversed.',
          actionLabel: 'Activate Group',
          variant: 'primary' as const,
        };
      case 'Completed':
        return {
          title: `Mark as Completed — ${group.group_name}`,
          description:
            'Mark this group as completed when all members have finished all installment payments.',
          actionLabel: 'Mark Completed',
          variant: 'primary' as const,
        };
      case 'Closed':
        return {
          title: `Close Group — ${group.group_name}`,
          description:
            'Closing a group is a permanent business action. All historical data, records, and reports will remain fully preserved and read-only.',
          actionLabel: 'Close Group',
          variant: 'danger' as const,
        };
      default:
        return {
          title: `Update Group Status — ${group.group_name}`,
          description: `Change status from ${group.status} to ${targetStatus}.`,
          actionLabel: 'Update Status',
          variant: 'primary' as const,
        };
    }
  };

  const config = getModalConfig();

  const handleConfirm = async () => {
    await onConfirm(group, targetStatus);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-secondary-900">
          {config.title}
        </h2>
        <p className="mb-6 text-sm text-secondary-600">
          {config.description}
        </p>

        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={config.variant}
            type="button"
            isLoading={isLoading}
            onClick={handleConfirm}
          >
            {config.actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
