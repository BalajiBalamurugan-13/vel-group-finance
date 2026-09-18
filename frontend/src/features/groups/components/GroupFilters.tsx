import { Search, MapPin } from 'lucide-react';
import { Input, Select } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { GroupFiltersState, GroupStatus } from '../types';

interface GroupFiltersProps {
  filters: GroupFiltersState;
  onFilterChange: (filters: GroupFiltersState) => void;
  locations?: string[];
}

// "Closed" is intentionally excluded — it is not a user-facing lifecycle filter.
const STATUS_TABS: Array<{ label: string; value: GroupStatus | 'All' }> = [
  { label: 'All', value: 'All' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Active', value: 'Active' },
  { label: 'Completed', value: 'Completed' },
];

export function GroupFilters({
  filters,
  onFilterChange,
  locations = [],
}: GroupFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Search & Location Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <div className="flex-1 min-w-0">
          <Input
            id="group-search"
            placeholder="Search groups..."
            value={filters.search || ''}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
            leftElement={<Search className="h-4 w-4" />}
          />
        </div>

        {locations.length > 0 ? (
          <div className="sm:w-48 min-w-0">
            <Select
              id="group-location-filter"
              value={filters.location || ''}
              onChange={(e) =>
                onFilterChange({ ...filters, location: e.target.value })
              }
              leftElement={<MapPin className="h-4 w-4" />}
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
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
                onFilterChange({ ...filters, status: tab.value })
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
