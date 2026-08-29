/**
 * VEL Finance — Dashboard Recent Collections Component
 * ======================================================
 * Renders the latest 10 paid collection records.
 * Desktop: compact table.  Mobile: stacked cards.
 * No financial calculations — all values come from backend.
 */
import type { RecentCollection } from '../types';
import { Calendar, CheckCircle, User } from 'lucide-react';
import { cn } from '@/lib/cn';

interface RecentCollectionsTableProps {
  collections: RecentCollection[];
}

/**
 * Format a decimal string value as ₹ for display.
 * Uses Intl.NumberFormat — display only, no arithmetic.
 */
function formatAmount(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/** Format ISO date as localised short date. */
function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export function RecentCollectionsTable({ collections }: RecentCollectionsTableProps) {
  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-secondary-400">
        <CheckCircle className="h-8 w-8 mb-2 opacity-50" aria-hidden="true" />
        <p className="text-sm">No collections recorded yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm" aria-label="Recent collections">
          <thead>
            <tr className="border-b border-border bg-secondary-50/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wide">
                Member
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wide">
                Group
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wide">
                Week
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wide">
                Amount
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wide">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {collections.map((c) => (
              <tr
                key={c.id}
                className="hover:bg-secondary-50/40 transition-colors duration-150"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-primary-600" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-secondary-800 truncate max-w-[140px]">
                          {c.member_name ?? '—'}
                        </span>
                        {c.member_code && (
                          <span className="inline-flex items-center px-1 py-0.2 rounded text-[10px] font-mono font-medium bg-secondary-100 text-secondary-600">
                            {c.member_code}
                          </span>
                        )}
                      </div>
                      {c.receipt_code && (
                        <div className="text-[10px] font-mono text-success-700 font-medium">
                          {c.receipt_code}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-secondary-600 truncate max-w-[120px]">
                  {c.group_name ?? '—'}
                  {c.location && (
                    <span className="ml-1 text-xs text-secondary-400">({c.location})</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-secondary-100 text-xs font-semibold text-secondary-700">
                    {c.week_number}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold font-mono text-success-700">
                  {formatAmount(c.amount_paid)}
                </td>
                <td className="px-4 py-3 text-right text-secondary-500 whitespace-nowrap">
                  {formatDate(c.payment_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden divide-y divide-border">
        {collections.map((c) => (
          <div key={c.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-600" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-secondary-800 truncate text-sm">
                      {c.member_name ?? '—'}
                    </p>
                    {c.member_code && (
                      <span className="inline-flex items-center px-1 py-0.2 rounded text-[10px] font-mono font-medium bg-secondary-100 text-secondary-600">
                        {c.member_code}
                      </span>
                    )}
                    {c.receipt_code && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-success-50 text-success-700 border border-success-200/60">
                        {c.receipt_code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary-500 truncate mt-0.5">
                    {c.group_name ?? '—'}
                    {c.location ? ` · ${c.location}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className={cn('font-bold font-mono text-success-700 text-sm')}>
                  {formatAmount(c.amount_paid)}
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <Calendar className="h-3 w-3 text-secondary-400" aria-hidden="true" />
                  <span className="text-xs text-secondary-400">{formatDate(c.payment_date)}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-secondary-500">
                Week {c.week_number}
              </span>
              {c.collector_name && (
                <span className="text-xs text-secondary-400">· {c.collector_name}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
