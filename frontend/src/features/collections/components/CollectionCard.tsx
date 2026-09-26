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
    <Card
      className="flex flex-col p-0 overflow-hidden shadow-sm cursor-pointer hover:border-primary-300 active:scale-[0.99] transition-all"
      onClick={() => onViewDetails(collection)}
    >
      {/* Header: Member, Receipt Code, Status & Group */}
      <div className="px-4 pt-3 pb-2">
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
            <p className="mt-0.5 text-xs text-secondary-500 truncate">
              {collection.group_name} • {collection.location}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary-100 text-secondary-800">
              W{collection.week_number}
            </span>
            <CollectionStatusBadge status={collection.payment_status} />
          </div>
        </div>
      </div>

      {/* Amount & Date Bar */}
      <div className="px-4 py-2 bg-secondary-50/60 border-y border-border">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400">
              Amount Paid
            </div>
            <div className="mt-0.5 text-xs font-bold text-secondary-900 font-mono tabular-nums">
              {formatCurrency(amount)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400">
              Payment Date
            </div>
            <div className="mt-0.5 text-xs font-medium text-secondary-700 tabular-nums">
              {formatDate(collection.payment_date)}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Action */}
      <div className="px-4 py-2 bg-secondary-50/50 flex items-center justify-between text-xs text-secondary-500">
        <span className="truncate mr-2 text-[11px]">Collector: {collection.collector_name || 'Admin'}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(collection);
          }}
          className="text-secondary-600 hover:text-primary-600 flex-shrink-0 min-h-[36px]"
          aria-label={`View details for ${collection.member_name || 'member'}`}
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          Details
        </Button>
      </div>
    </Card>
  );
}
