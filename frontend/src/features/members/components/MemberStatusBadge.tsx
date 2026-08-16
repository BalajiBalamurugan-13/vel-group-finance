import { Badge } from '@/components/ui/Badge';
import type { StatusVariant } from '@/types';
import type { MemberStatus } from '../types';

interface MemberStatusBadgeProps {
  status: MemberStatus;
  className?: string;
}

const statusVariantMap: Record<MemberStatus, StatusVariant> = {
  Active: 'success',
  Completed: 'info',
  Closed: 'neutral',
};

export function MemberStatusBadge({ status, className }: MemberStatusBadgeProps) {
  return (
    <Badge variant={statusVariantMap[status] || 'neutral'} className={className}>
      {status}
    </Badge>
  );
}
