import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/utils/format';
import { CollectionStatusBadge } from './CollectionStatusBadge';
import type { Collection } from '../types';

interface CollectionTableProps {
  collections: Collection[];
  onViewDetails: (collection: Collection) => void;
}

export function CollectionTable({
  collections,
  onViewDetails,
}: CollectionTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <table className="w-full text-left text-sm text-secondary-600">
        <thead className="bg-secondary-50 text-xs font-semibold uppercase tracking-wider text-secondary-500 border-b border-border">
          <tr>
            <th scope="col" className="py-2.5 pl-4 pr-3 sm:pl-6">
              Member
            </th>
            <th scope="col" className="px-3 py-2.5">
              Group / Location
            </th>
            <th scope="col" className="px-3 py-2.5 text-center">
              Week
            </th>
            <th scope="col" className="px-3 py-2.5 text-right">
              Amount Paid
            </th>
            <th scope="col" className="px-3 py-2.5">
              Payment Date
            </th>
            <th scope="col" className="px-3 py-2.5">
              Collector
            </th>
            <th scope="col" className="px-3 py-2.5">
              Status
            </th>
            <th scope="col" className="relative py-2.5 pl-3 pr-4 sm:pr-6 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {collections.map((collection) => {
            const amount = Number(collection.amount_paid);

            return (
              <tr
                key={collection.id}
                className="hover:bg-secondary-50/50 transition-colors"
              >
                {/* Member */}
                <td className="py-3 pl-4 pr-3 sm:pl-6">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-secondary-900">
                      {collection.member_name || '—'}
                    </span>
                    {collection.receipt_code && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-success-50 text-success-700 border border-success-200/60">
                        {collection.receipt_code}
                      </span>
                    )}
                  </div>
                  {collection.phone_number && (
                    <div className="text-xs text-secondary-400 font-mono">
                      {collection.phone_number}
                    </div>
                  )}
                </td>

                {/* Group */}
                <td className="px-3 py-3">
                  <div className="font-medium text-secondary-800">
                    {collection.group_name || '—'}
                  </div>
                  {collection.location && (
                    <div className="text-xs text-secondary-400">
                      {collection.location}
                    </div>
                  )}
                </td>

                {/* Week Number */}
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-100 text-secondary-800">
                    W{collection.week_number}
                    {collection.total_weeks ? ` / ${collection.total_weeks}` : ''}
                  </span>
                </td>

                {/* Amount Paid */}
                <td className="px-3 py-3 text-right font-semibold text-secondary-900">
                  {formatCurrency(amount)}
                </td>

                {/* Payment Date */}
                <td className="px-3 py-3 whitespace-nowrap text-secondary-600">
                  {formatDate(collection.payment_date)}
                </td>

                {/* Collector */}
                <td className="px-3 py-3 text-secondary-600">
                  {collection.collector_name || 'Admin'}
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  <CollectionStatusBadge status={collection.payment_status} />
                </td>

                {/* Actions */}
                <td className="py-3 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(collection)}
                    className="h-8 px-2 text-secondary-600 hover:text-primary-600"
                    title="View Collection Details"
                    aria-label={`View collection details for ${collection.member_name || 'member'}`}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Details
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
