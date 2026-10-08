/**
 * VEL Finance — Expense Drawer Component
 * ======================================
 * Right-sliding slide-over drawer displaying business expenses.
 * Matches the UX & aesthetics of ExpenseDrawer in Vel Finance DL.
 */
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Receipt,
  Search,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { useLanguage } from '@/i18n';
import { useExpenses, useDeleteExpense } from '../hooks/useExpenses';
import { AddExpenseModal } from './AddExpenseModal';
import type { Expense } from '../types';

interface ExpenseDrawerProps {
  open: boolean;
  onClose: () => void;
  onExpenseAdded?: (amount: number, note: string) => void;
}

export function ExpenseDrawer({ open, onClose, onExpenseAdded }: ExpenseDrawerProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: expenses = [], isLoading } = useExpenses();
  const { mutateAsync: deleteExpense } = useDeleteExpense();

  const totalExpense = useMemo(() => {
    return (expenses || []).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return expenses;
    return expenses.filter(
      (item) =>
        item.note.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        item.date.includes(q)
    );
  }, [expenses, search]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this expense? The amount will be refunded to Available Cash.')) {
      return;
    }
    try {
      setDeletingId(id);
      await deleteExpense(id);
    } catch {
      // Handled
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

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
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-error-50 border border-error-200/60 flex items-center justify-center text-error-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-secondary-900">
                {t('expenses.title') || 'Business Expenses'}
              </h2>
              <p className="text-xs text-secondary-500 mt-0.5">
                {expenses.length} {t('expenses.items') || 'records'} • {formatCurrency(totalExpense)}
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

        {/* Total Metric Card & Add Button */}
        <div className="p-4 bg-secondary-50/70 border-b border-border space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between bg-surface rounded-xl p-3.5 border border-border shadow-2xs">
            <div>
              <span className="text-[11px] font-semibold text-secondary-500 uppercase tracking-wider">
                {t('expenses.totalExpenses') || 'Total Expenses'}
              </span>
              <div className="text-2xl font-bold font-mono text-error-600 mt-0.5">
                {formatCurrency(totalExpense)}
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-error-600 hover:bg-error-700 text-white shadow-xs"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {t('expenses.addExpense') || 'Add Expense'}
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder={t('expenses.searchPlaceholder') || 'Search by note, category or date...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:border-error-500 focus:ring-1 focus:ring-error-500"
            />
          </div>
        </div>

        {/* Expenses List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-secondary-400">
              {t('common.loading') || 'Loading expenses...'}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="h-10 w-10 text-secondary-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-secondary-700">
                {t('expenses.noExpenses') || 'No Expenses Recorded'}
              </p>
              <p className="text-xs text-secondary-400 mt-1 max-w-xs mx-auto">
                {search
                  ? 'No expenses matched your search term.'
                  : 'Add office, travel, printing, or daily expenses here to deduct from Available Cash.'}
              </p>
            </div>
          ) : (
            filteredExpenses.map((exp: Expense) => (
              <div
                key={exp.id}
                className="bg-surface border border-border rounded-xl p-3 shadow-2xs hover:border-error-200 transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-secondary-900 truncate">
                      {exp.note}
                    </p>
                    {exp.category && exp.category !== 'General' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-100 text-secondary-600 font-medium flex-shrink-0">
                        {exp.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-secondary-400 mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>{exp.date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-bold font-mono text-error-600">
                    -{formatCurrency(Number(exp.amount))}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(exp.id)}
                    disabled={deletingId === exp.id}
                    className="p-1 text-secondary-400 hover:text-error-600 rounded transition-colors"
                    title="Delete expense"
                    aria-label="Delete expense"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-border bg-surface text-center flex-shrink-0">
          <p className="text-[11px] text-secondary-500">
            {t('expenses.footerInfo') || 'All expenses automatically reduce Dashboard Available Cash.'}
          </p>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <AddExpenseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(amt, note) => {
            if (onExpenseAdded) onExpenseAdded(amt, note);
          }}
        />
      )}
    </div>,
    document.body
  );
}
