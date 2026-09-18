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
    <Card className="p-3.5 border border-border shadow-sm flex flex-col gap-2.5">
      {/* Header: Member & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-secondary-900 text-sm truncate">
              {collection.member_name || 'Member'}
            </h3>
            {collection.receipt_code && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-success-50 text-success-700 border border-success-200/60 flex-shrink-0">
                {collection.receipt_code}
              </span>
            )}
          </div>
          <p className="text-xs text-secondary-500 truncate">
            {collection.group_name} • {collection.location}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary-100 text-secondary-800">
            W{collection.week_number}
          </span>
          <CollectionStatusBadge status={collection.payment_status} />
        </div>
      </div>

      {/* Amount & Date Bar */}
      <div className="grid grid-cols-2 gap-2 py-2 px-2.5 bg-secondary-50 rounded-lg text-xs">
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
        <span className="truncate mr-2">Collector: {collection.collector_name || 'Admin'}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(collection)}
          className="px-2 text-xs font-medium text-secondary-600 hover:text-primary-600 flex-shrink-0"
          aria-label={`View details for ${collection.member_name || 'member'}`}
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          Details
        </Button>
      </div>
    </Card>
  );
}
