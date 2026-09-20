import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Landmark, PlusCircle, ArrowUpRight, Coins } from 'lucide-react';
import type { InvestmentSummary } from '../types';

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
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-secondary-900 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary-600" />
            Owner Capital &amp; Investments
          </h3>
        </div>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<PlusCircle className="h-3.5 w-3.5" />}
          onClick={onOpenRecordModal}
          className="self-start sm:self-auto shrink-0"
        >
          Record Investment
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Initial Investment */}
        <Card className="p-4 border-l-4 border-l-primary-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              Initial Investment
            </span>
            <span className="text-[11px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
              9 Aug 2026 · Wk 1
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-secondary-900">
            {formatINR(summary?.total_initial_investment)}
          </div>
          <div className="mt-1 text-xs text-secondary-500">
            {summary?.count_initial || 0} entry · Starting capital
          </div>
        </Card>

        {/* Additional Investment */}
        <Card className="p-4 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              Additional Investment
            </span>
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-secondary-900">
            {formatINR(summary?.total_additional_investment)}
          </div>
          <div className="mt-1 text-xs text-secondary-500">
            {summary?.count_additional || 0} entries · Added in later weeks
          </div>
        </Card>

        {/* Total Owner Capital */}
        <Card className="p-4 border-l-4 border-l-indigo-600 bg-gradient-to-br from-surface to-indigo-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              Total Owner Capital
            </span>
            <Coins className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-950">
            {formatINR(summary?.total_owner_investment)}
          </div>
          <div className="mt-1 text-xs text-indigo-700 font-medium">
            Initial + Additional Capital Introduced
          </div>
        </Card>
      </div>
    </div>
  );
}
