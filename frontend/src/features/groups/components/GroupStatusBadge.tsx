import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/i18n';
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

const statusTamilMap: Record<GroupStatus, string> = {
  Draft: 'வரைவு',
  Active: 'செயலில்',
  Completed: 'முடிந்தது',
  Renewed: 'புதுப்பிக்கப்பட்டது',
  Closed: 'மூடப்பட்டது',
};

export function GroupStatusBadge({ status, className }: GroupStatusBadgeProps) {
  const { language } = useLanguage();
  const label = language === 'ta' ? (statusTamilMap[status] || status) : status;

  return (
    <Badge variant={statusVariantMap[status] || 'neutral'} className={className}>
      {label}
    </Badge>
  );
}
