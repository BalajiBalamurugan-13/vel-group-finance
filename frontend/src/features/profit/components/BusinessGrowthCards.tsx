import { Card } from '@/components/ui/Card';
import { Layers, Repeat, Sparkles, Building2 } from 'lucide-react';
import type { ProfitSummary } from '../types';

interface BusinessGrowthCardsProps {
  summary?: ProfitSummary;
}

export function BusinessGrowthCards({ summary }: BusinessGrowthCardsProps) {
  const recycledCount = summary?.groups_by_funding_source['Recycled Collections'] || 0;
  const initialCount = summary?.groups_by_funding_source['Initial Investment'] || 0;
  const additionalCount = summary?.groups_by_funding_source['Additional Investment'] || 0;
  const totalGroups = summary?.total_groups_count || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-secondary-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            Business Growth &amp; Group Funding Sources
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Recycled Collections */}
        <Card className="p-4 border-l-4 border-l-cyan-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              Recycled Collections
            </span>
            <Repeat className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-secondary-900">{recycledCount}</span>
            <span className="text-xs text-secondary-500">groups funded</span>
          </div>
          <div className="mt-1 text-xs text-cyan-700 font-medium">
            Formed from ongoing business cash flow
          </div>
        </Card>

        {/* Initial Investment */}
        <Card className="p-4 border-l-4 border-l-primary-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              Initial Investment
            </span>
            <Building2 className="h-4 w-4 text-primary-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-secondary-900">{initialCount}</span>
            <span className="text-xs text-secondary-500">groups funded</span>
          </div>
          <div className="mt-1 text-xs text-primary-700 font-medium">
            Formed directly from 9 Aug 2026 starting capital
          </div>
        </Card>

        {/* Additional Investment */}
        <Card className="p-4 border-l-4 border-l-amber-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              Additional Investment
            </span>
            <Sparkles className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-secondary-900">{additionalCount}</span>
            <span className="text-xs text-secondary-500">groups funded</span>
          </div>
          <div className="mt-1 text-xs text-amber-700 font-medium">
            Formed from later owner capital injections
          </div>
        </Card>
      </div>

      <div className="rounded-lg bg-secondary-50/70 border border-border p-3 text-xs text-secondary-600">
        <strong>Total Business Portfolio:</strong> {totalGroups} groups · {summary?.total_members_count || 0} active members · {summary?.active_loan_cycles_count || 0} active loan cycles
      </div>
    </div>
  );
}
