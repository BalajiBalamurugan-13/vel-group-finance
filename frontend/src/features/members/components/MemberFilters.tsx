import { Search, Users } from 'lucide-react';
import { Input, Select } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { MemberFiltersState, MemberStatus } from '../types';

interface MemberFiltersProps {
  filters: MemberFiltersState;
  onFilterChange: (filters: MemberFiltersState) => void;
  groups?: Array<{ id: string; group_name: string; location?: string }>;
}

// "Closed" is intentionally excluded — not a user-facing lifecycle filter.
const STATUS_TABS: Array<{ label: string; value: MemberStatus | 'All' }> = [
  { label: 'All', value: 'All' },
  { label: 'Active', value: 'Active' },
  { label: 'Completed', value: 'Completed' },
];

export function MemberFilters({
  filters,
  onFilterChange,
  groups = [],
}: MemberFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Search & Group Filter Row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <div className="flex-1 min-w-0">
          <Input
            id="member-search"
            placeholder="Search by name or phone..."
            value={filters.search || ''}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
            leftElement={<Search className="h-4 w-4" />}
          />
        </div>

        {groups.length > 0 && (
          <div className="sm:w-56 min-w-0">
            <Select
              id="member-group-filter"
              value={filters.group_id || 'All'}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  group_id: e.target.value === 'All' ? undefined : e.target.value,
                })
              }
              leftElement={<Users className="h-4 w-4" />}
            >
              <option value="All">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name} {g.location ? `(${g.location})` : ''}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scroll-smooth">
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
                'inline-flex min-h-[36px] flex-shrink-0 items-center rounded-lg px-3.5 py-1.5',
                'text-xs font-medium transition-colors whitespace-nowrap',
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
