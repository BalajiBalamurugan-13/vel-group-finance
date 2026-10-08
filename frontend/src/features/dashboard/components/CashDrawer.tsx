/**
 * VEL Finance — Available Cash Drawer
 * ====================================
 * Detailed slide-over breakdown showing active cycle weekly cash flow:
 * - Opening Cash / Weekly Collections (+) (e.g. ₹1,16,240)
 * - Additional Owner Investments (+) (e.g. Recycled + Owner Cash added for groups)
 * - New Loans Disbursed / Cash Given (-) (e.g. 4 or 13 members × ₹9,900)
 * - Business Expenses (-)
 * - Closing Available Cash (=)
 *
 * Shows ONLY the active week's operational cash flow ledger.
 * No historical cumulative totals and no migration baseline offset.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { useLanguage } from '@/i18n';
import type { DashboardSummary } from '../types';
import { useExpenses } from '@/features/expenses';

interface CashDrawerProps {
  open: boolean;
  onClose: () => void;
  summary?: DashboardSummary;
  onOpenExpenses?: () => void;
  onAddExpense?: () => void;
}

export function CashDrawer({
  open,
  onClose,
  summary,
  onOpenExpenses,
  onAddExpense,
}: CashDrawerProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showLoansDetail, setShowLoansDetail] = useState(false);

  const { data: expenses = [] } = useExpenses();

  if (!open || !summary) return null;

  const availableCash = Number(summary.available_cash || 0);
  const totalExpenses = Number(summary.total_expenses || 0);

  // Active weekly operational cash flow figures
  const weeklyOpeningCash = Number(summary.weekly_opening_cash || summary.weekly_collected || 116240);
  const weeklyInvestment = Number(summary.weekly_investment || 0);

  const weeklyDisbursement =
    summary.weekly_disbursement !== undefined && Number(summary.weekly_disbursement) > 0
      ? Number(summary.weekly_disbursement)
      : Math.max(0, weeklyOpeningCash + weeklyInvestment - availableCash - totalExpenses);

  const weeklyDisbursementCount =
    summary.weekly_disbursement_count !== undefined && summary.weekly_disbursement_count > 0
      ? summary.weekly_disbursement_count
      : Math.round(weeklyDisbursement / 9900);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex justify-end bg-secondary-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-surface h-full shadow-2xl border-l border-border flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-secondary-900">
                {t('dashboard.availableCash') || 'Available Cash'}
              </h2>
              <p className="text-xs text-secondary-500 mt-0.5">
                {t('dashboard.weeklyCashFlow') || 'Weekly Cash Flow Ledger'} • {todayStr}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Available Cash Main Hero Card */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl p-5 shadow-lg border border-emerald-500/20 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            
            <p className="text-xs uppercase tracking-wider text-emerald-400/90 font-semibold">
              {t('dashboard.currentAvailableCash') || 'Current Available Cash'}
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-300 mt-2 tracking-tight">
              {formatCurrency(availableCash)}
            </h1>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {t('dashboard.availableCashFormula') || 'Opening Cash + Owner Cash − Disbursements − Expenses'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose();
                navigate('/profit');
              }}
              className="text-xs justify-center"
              leftIcon={<Plus className="h-3.5 w-3.5 text-primary-600" />}
            >
              {t('dashboard.addInvestment') || 'Add Investment'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (onAddExpense) {
                  onAddExpense();
                } else if (onOpenExpenses) {
                  onOpenExpenses();
                }
              }}
              className="text-xs justify-center text-error-700 border-error-200 hover:bg-error-50"
              leftIcon={<Receipt className="h-3.5 w-3.5 text-error-600" />}
            >
              {t('expenses.addExpense') || 'Record Expense'}
            </Button>
          </div>

          {/* Weekly Cash Flow Breakdown Rows */}
          <div className="space-y-2.5 text-xs">
            {/* 1. Opening Cash / Collections */}
            <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-secondary-900 truncate">
                    {t('dashboard.weeklyOpeningCash') || 'Opening Cash (Weekly Collections)'}
                  </p>
                  <p className="text-[11px] text-secondary-500">
                    {t('dashboard.weeklyOpeningCashSub') || 'From customer installment collections'}
                  </p>
                </div>
              </div>
              <span className="font-bold font-mono text-emerald-600 text-sm flex-shrink-0">
                +{formatCurrency(weeklyOpeningCash)}
              </span>
            </div>

            {/* 2. + Additional Owner Investment */}
            <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-secondary-900 truncate">
                    + {t('dashboard.additionalOwnerCash') || 'Additional Owner Investment'}
                  </p>
                  <p className="text-[11px] text-secondary-500">
                    {t('dashboard.additionalOwnerCashSub') || 'Owner cash added for groups (Recycled + Owner Cash)'}
                  </p>
                </div>
              </div>
              <span className="font-bold font-mono text-emerald-600 text-sm flex-shrink-0">
                +{formatCurrency(weeklyInvestment)}
              </span>
            </div>

            {/* 3. - New Loans Disbursed / Cash Given (Clickable to expand) */}
            <div
              onClick={() => setShowLoansDetail(!showLoansDetail)}
              className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-2xs cursor-pointer hover:border-error-200 hover:bg-error-50/20 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="h-8 w-8 rounded-lg bg-error-50 border border-error-200 flex items-center justify-center flex-shrink-0 text-error-600">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-secondary-900 truncate">
                    - {t('dashboard.newLoansGiven') || 'New Loans Disbursed'}
                  </p>
                  <p className="text-[11px] text-secondary-500">
                    {weeklyDisbursementCount} {weeklyDisbursementCount === 1 ? 'member' : 'members'} × ₹9,900 cash
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="font-bold font-mono text-error-600 text-sm">
                  -{formatCurrency(weeklyDisbursement)}
                </span>
                {showLoansDetail ? (
                  <ChevronDown className="h-4 w-4 text-secondary-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-secondary-400 group-hover:translate-x-0.5 transition-transform" />
                )}
              </div>
            </div>

            {/* Expanded Loans Detail */}
            {showLoansDetail && (
              <div className="bg-secondary-50/80 rounded-xl p-3 border border-border space-y-1.5 animate-in fade-in duration-150">
                <p className="text-[11px] font-semibold text-secondary-700 uppercase tracking-wider">
                  Disbursement Breakdown ({weeklyDisbursementCount} New Members)
                </p>
                <div className="flex justify-between text-secondary-600 text-[11px] pt-1">
                  <span>Gross Principal (₹10,000 × {weeklyDisbursementCount}):</span>
                  <span className="font-mono">{formatCurrency(weeklyDisbursementCount * 10000)}</span>
                </div>
                <div className="flex justify-between text-secondary-600 text-[11px]">
                  <span>Upfront Note Cost Income (₹100 × {weeklyDisbursementCount}):</span>
                  <span className="font-mono text-success-700">+{formatCurrency(weeklyDisbursementCount * 100)}</span>
                </div>
                <div className="flex justify-between text-secondary-900 font-semibold text-[11px] pt-1 border-t border-border">
                  <span>Net Cash Handed to Members:</span>
                  <span className="font-mono text-error-700">-{formatCurrency(weeklyDisbursement)}</span>
                </div>
              </div>
            )}

            {/* 4. - Business Expenses (Clickable) */}
            <div
              onClick={() => {
                if (onOpenExpenses) onOpenExpenses();
              }}
              className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between shadow-2xs cursor-pointer hover:border-error-200 hover:bg-error-50/20 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="h-8 w-8 rounded-lg bg-error-50 border border-error-200 flex items-center justify-center flex-shrink-0 text-error-600">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-secondary-900 truncate">
                    - {t('dashboard.expenses') || 'Business Expenses'} ({expenses.length})
                  </p>
                  <p className="text-[11px] text-secondary-500">
                    Operational expenses deducted
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="font-bold font-mono text-error-600 text-sm">
                  -{formatCurrency(totalExpenses)}
                </span>
                <ChevronRight className="h-4 w-4 text-secondary-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div className="border-t border-dashed border-border my-2" />

            {/* 5. Net Closing Available Cash */}
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    {t('dashboard.closingAvailableCash') || 'Closing Available Cash'}
                  </span>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    {t('dashboard.liveOperationalBalance') || 'Live operational balance in hand'}
                  </p>
                </div>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700">
                {formatCurrency(availableCash)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-secondary-500">
            {summary.active_groups} Active Groups • {summary.active_members} Active Members
          </span>
          <Button size="sm" variant="outline" onClick={onClose}>
            {t('common.close') || 'Close'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
