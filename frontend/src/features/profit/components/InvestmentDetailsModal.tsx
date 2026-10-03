import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUpRight, Landmark, Calendar, FileText } from 'lucide-react';
import type { Investment, InvestmentType } from '../types';

interface InvestmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  investments: Investment[];
  filterType: InvestmentType | 'all';
  title: string;
  totalAmount: number;
}

function formatINR(val?: number): string {
  if (val === undefined || val === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function InvestmentDetailsModal({
  isOpen,
  onClose,
  investments,
  filterType,
  title,
  totalAmount,
}: InvestmentDetailsModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close
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

  if (!isOpen) return null;

  const filtered =
    filterType === 'all'
      ? investments
      : investments.filter((inv) => inv.investment_type === filterType);

  const isAdditional = filterType === 'Additional';

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-secondary-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex flex-col w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isAdditional
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-primary-100 text-primary-600'
              }`}
            >
              {isAdditional ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <Landmark className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-secondary-900">
                {title}
              </h2>
              <p className="text-xs text-secondary-500 mt-0.5">
                {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}{' '}
                · Total: {formatINR(totalAmount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-secondary-400">
              No investment entries found.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary-50 border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                        Week
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((inv, idx) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-secondary-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-secondary-400 font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-secondary-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-secondary-400 shrink-0" />
                            {formatDate(inv.investment_date)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isAdditional
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-primary-50 text-primary-700'
                            }`}
                          >
                            Wk {inv.business_week}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-secondary-700 max-w-[250px]">
                          <div className="flex items-start gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-secondary-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 text-xs leading-relaxed">
                              {inv.description || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-secondary-900 whitespace-nowrap">
                          {formatINR(
                            typeof inv.amount === 'string'
                              ? parseFloat(inv.amount)
                              : inv.amount
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-secondary-50 border-t-2 border-secondary-200">
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-sm font-bold text-secondary-700 uppercase"
                      >
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold text-secondary-900">
                        {formatINR(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-border">
                {filtered.map((inv, idx) => (
                  <div key={inv.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-secondary-400 font-mono">
                          #{idx + 1}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            isAdditional
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-primary-50 text-primary-700'
                          }`}
                        >
                          Wk {inv.business_week}
                        </span>
                        <span className="text-xs text-secondary-500">
                          {formatDate(inv.investment_date)}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-secondary-900">
                        {formatINR(
                          typeof inv.amount === 'string'
                            ? parseFloat(inv.amount)
                            : inv.amount
                        )}
                      </span>
                    </div>
                    {inv.description && (
                      <p className="text-xs text-secondary-500 leading-relaxed pl-5">
                        {inv.description}
                      </p>
                    )}
                  </div>
                ))}

                {/* Mobile Total */}
                <div className="px-4 py-3 bg-secondary-50 flex items-center justify-between">
                  <span className="text-sm font-bold text-secondary-700 uppercase">
                    Total
                  </span>
                  <span className="text-base font-bold text-secondary-900">
                    {formatINR(totalAmount)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
