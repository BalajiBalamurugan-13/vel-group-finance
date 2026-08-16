import { Badge } from '@/components/ui/Badge';
import type { PaymentStatus } from '../types';

interface CollectionStatusBadgeProps {
  status: PaymentStatus;
}

export function CollectionStatusBadge({ status }: CollectionStatusBadgeProps) {
  switch (status) {
    case 'Paid':
      return <Badge variant="success">Paid</Badge>;
    case 'Pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'Partial':
      return <Badge variant="info">Partial</Badge>;
    case 'Waived':
      return <Badge variant="neutral">Waived</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
