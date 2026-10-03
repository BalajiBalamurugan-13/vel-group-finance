import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Landmark, PlusCircle, ArrowUpRight, Coins } from 'lucide-react';
import { useLanguage } from '@/i18n';
import type { InvestmentSummary, InvestmentType } from '../types';
import { InvestmentDetailsModal } from './InvestmentDetailsModal';

interface InvestmentSummaryCardsProps {
  summary?: InvestmentSummary;
  onOpenRecordModal: () => void;
}

function formatINR(val?: number): string {
  if (val === undefined || val === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function InvestmentSummaryCards({
  summary,
  onOpenRecordModal,
}: InvestmentSummaryCardsProps) {
  const { t } = useLanguage();
  const [detailFilter, setDetailFilter] = useState<InvestmentType | 'all' | null>(null);

  const detailTitle =
    detailFilter === 'Initial'
      ? 'Initial Investment Entries'
      : detailFilter === 'Additional'
        ? 'Additional Investment Entries'
        : 'All Investment Entries';

  const detailTotal =
    detailFilter === 'Initial'
      ? summary?.total_initial_investment ?? 0
      : detailFilter === 'Additional'
        ? summary?.total_additional_investment ?? 0
        : summary?.total_owner_investment ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-secondary-900 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary-600" />
            {t('profit.ownerCapitalTitle')}
          </h3>
        </div>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<PlusCircle className="h-3.5 w-3.5" />}
          onClick={onOpenRecordModal}
          className="self-start sm:self-auto shrink-0"
        >
          {t('profit.recordInvestment')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Initial Investment */}
        <Card
          className="p-4 border-l-4 border-l-primary-600 cursor-pointer hover:shadow-md hover:border-l-primary-700 transition-all duration-200 group"
          onClick={() => setDetailFilter('Initial')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              {t('profit.initialInvestment')}
            </span>
            <span className="text-[11px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
              9 Aug 2026 · Wk 1
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-secondary-900 group-hover:text-primary-700 transition-colors">
            {formatINR(summary?.total_initial_investment)}
          </div>
          <div className="mt-1 text-xs text-secondary-500">
            {summary?.count_initial || 0} entry · Starting capital
            <span className="ml-1 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
              — Click to view
            </span>
          </div>
        </Card>

        {/* Additional Investment */}
        <Card
          className="p-4 border-l-4 border-l-emerald-600 cursor-pointer hover:shadow-md hover:border-l-emerald-700 transition-all duration-200 group"
          onClick={() => setDetailFilter('Additional')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              {t('profit.additionalInvestment')}
            </span>
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-secondary-900 group-hover:text-emerald-700 transition-colors">
            {formatINR(summary?.total_additional_investment)}
          </div>
          <div className="mt-1 text-xs text-secondary-500">
            {summary?.count_additional || 0} entries · Added in later weeks
            <span className="ml-1 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
              — Click to view
            </span>
          </div>
        </Card>

        {/* Total Owner Capital */}
        <Card
          className="p-4 border-l-4 border-l-indigo-600 bg-gradient-to-br from-surface to-indigo-50/30 cursor-pointer hover:shadow-md hover:border-l-indigo-700 transition-all duration-200 group"
          onClick={() => setDetailFilter('all')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              {t('profit.totalOwnerCapital')}
            </span>
            <Coins className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-950 group-hover:text-indigo-700 transition-colors">
            {formatINR(summary?.total_owner_investment)}
          </div>
          <div className="mt-1 text-xs text-indigo-700 font-medium">
            {t('profit.totalOwnerCapitalSub')}
            <span className="ml-1 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-normal">
              — Click to view all
            </span>
          </div>
        </Card>
      </div>

      {/* Investment Details Modal */}
      <InvestmentDetailsModal
        isOpen={detailFilter !== null}
        onClose={() => setDetailFilter(null)}
        investments={summary?.investments ?? []}
        filterType={detailFilter ?? 'all'}
        title={detailTitle}
        totalAmount={detailTotal}
      />
    </div>
  );
}
