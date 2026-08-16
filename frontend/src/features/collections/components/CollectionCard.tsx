import { Eye } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/utils/format';
import { CollectionStatusBadge } from './CollectionStatusBadge';
import type { Collection } from '../types';

interface CollectionCardProps {
  collection: Collection;
  onViewDetails: (collection: Collection) => void;
}

export function CollectionCard({
  collection,
  onViewDetails,
}: CollectionCardProps) {
  const amount = Number(collection.amount_paid);

  return (
    <Card className="p-4 border border-border shadow-sm flex flex-col gap-3">
      {/* Header: Member & Status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-secondary-900 text-base">
            {collection.member_name || 'Member'}
          </h3>
          <p className="text-xs text-secondary-500">
            {collection.group_name} • {collection.location}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-secondary-100 text-secondary-800">
            W{collection.week_number}
          </span>
          <CollectionStatusBadge status={collection.payment_status} />
        </div>
      </div>

      {/* Amount & Date Bar */}
      <div className="grid grid-cols-2 gap-2 py-2 px-3 bg-secondary-50 rounded-lg text-xs">
        <div>
          <span className="text-secondary-500 block">Amount Paid</span>
          <span className="font-bold text-secondary-900 text-sm">
            {formatCurrency(amount)}
          </span>
        </div>
        <div>
          <span className="text-secondary-500 block">Payment Date</span>
          <span className="font-medium text-secondary-700 text-sm">
            {formatDate(collection.payment_date)}
          </span>
        </div>
      </div>

      {/* Footer / Action */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs text-secondary-500">
        <span>Collector: {collection.collector_name || 'Admin'}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(collection)}
          className="min-h-[44px] px-3 text-xs font-medium text-secondary-700 hover:text-primary-600"
          aria-label={`View details for ${collection.member_name || 'member'}`}
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          View Details
        </Button>
      </div>
    </Card>
  );
}
