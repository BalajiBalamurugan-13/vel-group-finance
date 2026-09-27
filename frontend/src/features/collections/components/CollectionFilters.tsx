import { Search, Users, X } from 'lucide-react';
import { Input, Select, Button } from '@/components/ui';
import { useLanguage } from '@/i18n';
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
  const { t } = useLanguage();
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
    <div className="flex flex-col gap-2 mb-4">
      {/* Search Input */}
      <div className="min-w-0">
        <Input
          id="collection-search-input"
          type="text"
          placeholder={t('common.searchPlaceholder')}
          value={filters.search || ''}
          onChange={handleSearchChange}
          leftElement={<Search className="h-4 w-4" />}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {/* Group Dropdown */}
        <div className="w-full sm:w-56 min-w-0">
          <Select
            id="collection-group-filter"
            value={filters.group_id || 'All'}
            onChange={handleGroupChange}
            leftElement={<Users className="h-4 w-4" />}
            aria-label={t('dashboard.filterAllGroups')}
          >
            <option value="All">{t('dashboard.filterAllGroups')}</option>
            {activeGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group_name} ({g.location})
              </option>
            ))}
          </Select>
        </div>

        {/* Date Filter */}
        <input
          type="date"
          value={filters.payment_date || ''}
          onChange={handleDateChange}
          className="h-11 min-h-[44px] px-3 py-2 bg-surface border border-border rounded-lg text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-auto"
          aria-label={t('common.date')}
        />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-11 text-secondary-500 hover:text-secondary-800"
          >
            <X className="w-4 h-4 mr-1" />
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </div>
  );
}
