import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/i18n';
import type { PaymentStatus } from '../types';

interface CollectionStatusBadgeProps {
  status: PaymentStatus;
}

export function CollectionStatusBadge({ status }: CollectionStatusBadgeProps) {
  const { language } = useLanguage();

  switch (status) {
    case 'Paid':
      return <Badge variant="success">{language === 'ta' ? 'செலுத்தப்பட்டது' : 'Paid'}</Badge>;
    case 'Pending':
      return <Badge variant="warning">{language === 'ta' ? 'நிலுவை' : 'Pending'}</Badge>;
    case 'Partial':
      return <Badge variant="info">{language === 'ta' ? 'பகுதி தொகை' : 'Partial'}</Badge>;
    case 'Waived':
      return <Badge variant="neutral">{language === 'ta' ? 'தள்ளுபடி' : 'Waived'}</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
