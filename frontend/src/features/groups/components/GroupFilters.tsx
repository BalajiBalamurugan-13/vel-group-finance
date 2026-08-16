import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import type { GroupFiltersState, GroupStatus } from '../types';

interface GroupFiltersProps {
  filters: GroupFiltersState;
  onFilterChange: (filters: GroupFiltersState) => void;
  locations?: string[];
}

const STATUS_TABS: Array<{ label: string; value: GroupStatus | 'All' }> = [
  { label: 'All', value: 'All' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Active', value: 'Active' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Closed', value: 'Closed' },
];

export function GroupFilters({
  filters,
  onFilterChange,
  locations = [],
}: GroupFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Search & Location Bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          id="group-search"
          placeholder="Search by group name..."
          value={filters.search || ''}
          onChange={(e) =>
            onFilterChange({ ...filters, search: e.target.value })
          }
          leftElement={<Search className="h-4 w-4" />}
        />

        {locations.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3 flex items-center text-secondary-400">
                <MapPin className="h-4 w-4" />
              </div>
              <select
                id="group-location-filter"
                value={filters.location || ''}
                onChange={(e) =>
                  onFilterChange({ ...filters, location: e.target.value })
                }
                className={cn(
                  'h-11 min-h-[44px] w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm text-secondary-900',
                  'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                )}
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <Input
            id="group-location-filter-text"
            placeholder="Filter by location (e.g. PTM)..."
            value={filters.location || ''}
            onChange={(e) =>
              onFilterChange({ ...filters, location: e.target.value })
            }
            leftElement={<MapPin className="h-4 w-4" />}
          />
        )}
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const isSelected =
            (filters.status || 'All') === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() =>
                onFilterChange({ ...filters, status: tab.value })
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
