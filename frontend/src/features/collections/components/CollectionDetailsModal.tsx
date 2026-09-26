import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, Users, Receipt, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/utils/format';
import { CollectionStatusBadge } from './CollectionStatusBadge';
import type { Collection } from '../types';

interface CollectionDetailsModalProps {
  collection: Collection | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CollectionDetailsModal({
  collection,
  isOpen,
  onClose,
}: CollectionDetailsModalProps) {
  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !collection) return null;

  const amount = Number(collection.amount_paid);
  const outstanding = Number(collection.outstanding_amount || 0);
  const weeklyInst = Number(collection.weekly_installment || 0);

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-secondary-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-details-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border border-border max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Pinned Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 flex-shrink-0 bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="collection-details-title"
                className="text-base sm:text-lg font-bold text-secondary-900"
              >
                Collection Details
              </h2>
              <p className="text-xs text-secondary-500">
                Week {collection.week_number} • {formatDate(collection.payment_date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Main Transaction Highlight Card */}
          <div className="rounded-xl bg-primary-50/70 p-4 border border-primary-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-primary-800 uppercase tracking-wider">
                Collected Amount
              </span>
              <div className="text-2xl font-black text-primary-900 mt-0.5 font-mono">
                {formatCurrency(amount)}
              </div>
            </div>
            <div className="text-right">
              <CollectionStatusBadge status={collection.payment_status} />
              <div className="text-xs text-primary-700 font-medium mt-1.5 font-mono">
                Week {collection.week_number}
                {collection.total_weeks ? ` of ${collection.total_weeks}` : ''}
              </div>
            </div>
          </div>

          {/* Member & Group Info */}
          <div className="rounded-xl border border-border p-4 bg-secondary-50/50 space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-secondary-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs text-secondary-500 block">Member</span>
                <span className="font-semibold text-secondary-900 text-sm">
                  {collection.member_name || '—'}
                </span>
                {collection.phone_number && (
                  <span className="text-xs text-secondary-500 block font-mono">
                    {collection.phone_number}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-border/50">
              <Users className="w-4 h-4 text-secondary-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs text-secondary-500 block">Group / Location</span>
                <span className="font-semibold text-secondary-900 text-sm">
                  {collection.group_name || '—'}
                </span>
                {collection.location && (
                  <span className="text-xs text-secondary-500 block">
                    {collection.location}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-border/50">
              <Calendar className="w-4 h-4 text-secondary-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs text-secondary-500 block">Payment Date & Collector</span>
                <span className="font-medium text-secondary-900 text-sm font-mono">
                  {formatDate(collection.payment_date)}
                </span>
                <span className="text-xs text-secondary-500 block">
                  Received by: {collection.collector_name || 'Admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Outstanding & Loan Cycle Financial Metrics */}
          {weeklyInst > 0 && (
            <div className="rounded-xl border border-border p-4 bg-surface space-y-2.5">
              <h3 className="text-xs font-bold text-secondary-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success-600" />
                Cycle Financial Status
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-secondary-500 block">Standard Installment</span>
                  <span className="font-semibold text-secondary-900 font-mono">
                    {formatCurrency(weeklyInst)}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-500 block">Weeks Paid</span>
                  <span className="font-semibold text-secondary-900 font-mono">
                    {collection.weeks_paid ?? collection.week_number} /{' '}
                    {collection.total_weeks || 18}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-500 block">Remaining Weeks</span>
                  <span className="font-semibold text-secondary-900 font-mono">
                    {collection.remaining_installments ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-500 block">Current Outstanding</span>
                  <span className="font-bold text-secondary-900 font-mono">
                    {formatCurrency(outstanding)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Remarks */}
          {collection.remarks && (
            <div className="rounded-xl border border-border p-3.5 bg-secondary-50/30 text-xs">
              <span className="font-semibold text-secondary-700 block mb-1">
                Remarks
              </span>
              <p className="text-secondary-600 italic">{collection.remarks}</p>
            </div>
          )}
        </div>

        {/* Pinned Footer with safe-area spacing */}
        <div className="flex items-center justify-end px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border bg-surface flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <Button
            variant="outline"
            onClick={onClose}
            className="min-h-[44px] px-6 w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
