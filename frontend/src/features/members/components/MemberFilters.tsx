import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import type { MemberFiltersState, MemberStatus } from '../types';

interface MemberFiltersProps {
  filters: MemberFiltersState;
  onFilterChange: (filters: MemberFiltersState) => void;
  groups?: Array<{ id: string; group_name: string; location?: string }>;
}

const STATUS_TABS: Array<{ label: string; value: MemberStatus | 'All' }> = [
  { label: 'All', value: 'All' },
  { label: 'Active', value: 'Active' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Closed', value: 'Closed' },
];

export function MemberFilters({
  filters,
  onFilterChange,
  groups = [],
}: MemberFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Search & Group Filter Row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          id="member-search"
          placeholder="Search by name or phone..."
          value={filters.search || ''}
          onChange={(e) =>
            onFilterChange({ ...filters, search: e.target.value })
          }
          leftElement={<Search className="h-4 w-4" />}
        />

        {groups.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3 flex items-center text-secondary-400">
                <Users className="h-4 w-4" />
              </div>
              <select
                id="member-group-filter"
                value={filters.group_id || 'All'}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    group_id: e.target.value === 'All' ? undefined : e.target.value,
                  })
                }
                className={cn(
                  'h-11 min-h-[44px] w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm text-secondary-900',
                  'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                )}
              >
                <option value="All">All Groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.group_name} {g.location ? `(${g.location})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const isSelected = (filters.status || 'All') === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() =>
                onFilterChange({
                  ...filters,
                  status: tab.value === 'All' ? undefined : (tab.value as MemberStatus),
                })
              }
              className={cn(
                'inline-flex min-h-[36px] items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                isSelected
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-surface text-secondary-600 border border-border hover:bg-secondary-50 hover:text-secondary-900',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
