import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Group } from '@/features/groups/types';
import type { CollectionFiltersState } from '../types';

interface CollectionFiltersProps {
  filters: CollectionFiltersState;
  groups: Group[];
  onFilterChange: (filters: CollectionFiltersState) => void;
}

export function CollectionFilters({
  filters,
  groups,
  onFilterChange,
}: CollectionFiltersProps) {
  const activeGroups = groups.filter((g) => g.status === 'Active');

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      group_id: e.target.value === 'All' ? undefined : e.target.value,
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      payment_date: e.target.value || undefined,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      search: e.target.value,
    });
  };

  const handleClear = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Boolean(
    filters.group_id || filters.payment_date || filters.search
  );

  return (
    <div className="flex flex-col md:flex-row gap-3 mb-6">
      {/* Search Input */}
      <div className="relative flex-1">
        <Input
          id="collection-search-input"
          type="text"
          placeholder="Search collections by member or group..."
          value={filters.search || ''}
          onChange={handleSearchChange}
          leftElement={<Search className="w-4 h-4 text-secondary-400" />}
          className="w-full"
        />
      </div>

      <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3">
        {/* Group Dropdown */}
        <select
          value={filters.group_id || 'All'}
          onChange={handleGroupChange}
          className="h-10 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[140px]"
          aria-label="Filter by Group"
        >
          <option value="All">All Groups</option>
          {activeGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.group_name} ({g.location})
            </option>
          ))}
        </select>

        {/* Date Filter */}
        <input
          type="date"
          value={filters.payment_date || ''}
          onChange={handleDateChange}
          className="h-10 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Filter by Payment Date"
        />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-10 text-secondary-500 hover:text-secondary-800"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
