import { Input } from '@/components/ui/Input';
import { Search, Filter } from 'lucide-react';
import { useLanguage } from '@/i18n';
import type { LoanRiskFiltersState, RiskStatusCategory } from '../types';
import { cn } from '@/lib/cn';

interface LoanRiskFiltersProps {
  filters: LoanRiskFiltersState;
  onFilterChange: (filters: LoanRiskFiltersState) => void;
  groups?: Array<{ id: string; group_name: string }>;
}

export function LoanRiskFilters({
  filters,
  onFilterChange,
  groups = [],
}: LoanRiskFiltersProps) {
  const { language } = useLanguage();
  const currentStatus = filters.risk_status || 'All';

  const statusTabs: Array<{ label: string; value: RiskStatusCategory | 'All' }> = [
    { label: language === 'ta' ? 'அனைத்து உறுப்பினர்கள்' : 'All Members', value: 'All' },
    { label: language === 'ta' ? 'அதிக அபாயம் (4+ வாரங்கள்)' : 'At Risk (4+ wks)', value: 'At Risk' },
    { label: language === 'ta' ? 'தாமதம் (1–3 வாரங்கள்)' : 'Overdue (1–3 wks)', value: 'Overdue' },
    { label: language === 'ta' ? 'சரியான நிலை' : 'Current', value: 'Current' },
  ];

  return (
    <div className="space-y-3 bg-surface p-3.5 rounded-xl border border-border">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {statusTabs.map((tab) => {
          const isActive = currentStatus === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onFilterChange({ ...filters, risk_status: tab.value })}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-primary-600 text-white shadow-2xs'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200/70'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Inputs: Search and Group Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Input
            id="loan-risk-search"
            placeholder={language === 'ta' ? 'பெயர் அல்லது குறியீட்டைத் தேடுக...' : 'Search member name or code...'}
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            leftElement={<Search className="h-4 w-4 text-secondary-400" />}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-secondary-400 flex-shrink-0" />
          <select
            value={filters.group_id || 'all'}
            onChange={(e) => onFilterChange({ ...filters, group_id: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-secondary-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="all">{language === 'ta' ? 'அனைத்துக் குழுக்கள்' : 'All Groups'}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
