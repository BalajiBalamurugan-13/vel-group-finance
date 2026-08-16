import { Badge } from '@/components/ui/Badge';
import type { StatusVariant } from '@/types';
import type { GroupStatus } from '../types';

interface GroupStatusBadgeProps {
  status: GroupStatus;
  className?: string;
}

const statusVariantMap: Record<GroupStatus, StatusVariant> = {
  Draft: 'neutral',
  Active: 'success',
  Completed: 'info',
  Renewed: 'warning',
  Closed: 'neutral',
};

export function GroupStatusBadge({ status, className }: GroupStatusBadgeProps) {
  return (
    <Badge variant={statusVariantMap[status] || 'neutral'} className={className}>
      {status}
    </Badge>
  );
}
