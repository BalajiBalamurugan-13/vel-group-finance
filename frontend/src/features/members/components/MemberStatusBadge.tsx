import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/i18n';
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

const statusTamilMap: Record<MemberStatus, string> = {
  Active: 'செயலில்',
  Completed: 'முடிந்தது',
  Closed: 'மூடப்பட்டது',
};

export function MemberStatusBadge({ status, className }: MemberStatusBadgeProps) {
  const { language } = useLanguage();
  const label = language === 'ta' ? (statusTamilMap[status] || status) : status;

  return (
    <Badge variant={statusVariantMap[status] || 'neutral'} className={className}>
      {label}
    </Badge>
  );
}
