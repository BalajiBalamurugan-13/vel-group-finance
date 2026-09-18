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
          title: 'Activate Group',
          description: `Activate "${group.group_name}"? Loans will be disbursed to all members and weekly collections will begin.`,
          warning: 'This action cannot be reversed.',
          actionLabel: 'Activate Group',
          variant: 'primary' as const,
        };
      case 'Completed':
        return {
          title: 'Mark as Completed',
          description: `Mark "${group.group_name}" as completed? This indicates all members have finished their installment payments.`,
          warning: null,
          actionLabel: 'Mark Completed',
          variant: 'primary' as const,
        };
      case 'Closed':
        return {
          title: 'Close Group',
          description: `Close "${group.group_name}"? All data and records will remain preserved as read-only.`,
          warning: 'This is a permanent action.',
          actionLabel: 'Close Group',
          variant: 'danger' as const,
        };
      default:
        return {
          title: 'Update Status',
          description: `Change "${group.group_name}" from ${group.status} to ${targetStatus}?`,
          warning: null,
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
      <div className="w-full max-w-sm rounded-xl bg-surface p-4 sm:p-6 shadow-xl">
        <h2 className="text-base font-bold text-secondary-900">
          {config.title}
        </h2>
        <p className="mt-2 text-sm text-secondary-600 leading-relaxed">
          {config.description}
        </p>
        {config.warning && (
          <p className="mt-2 text-xs font-medium text-warning-700 bg-warning-50 rounded-md px-2.5 py-1.5">
            {config.warning}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={config.variant}
            size="sm"
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
