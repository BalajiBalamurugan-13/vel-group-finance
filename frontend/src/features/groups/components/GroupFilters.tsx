import { Search, MapPin, Sun, Moon } from 'lucide-react';
import { Input, Select } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/i18n';
import type { GroupFiltersState, GroupStatus } from '../types';
import type { CollectionSession } from '@/features/places';

export interface GroupLocationOption {
  value: string;
  label: string;
  session?: CollectionSession;
  order?: number;
}

export interface GroupFiltersProps {
  filters: GroupFiltersState;
  onFilterChange: (filters: GroupFiltersState) => void;
  locations?: string[];
  locationOptions?: GroupLocationOption[];
  sessionFilter?: 'all' | 'morning' | 'evening';
  onSessionFilterChange?: (session: 'all' | 'morning' | 'evening') => void;
  sessionCounts?: { all: number; morning: number; evening: number };
}

export function GroupFilters({
  filters,
  onFilterChange,
  locations = [],
  locationOptions,
  sessionFilter = 'all',
  onSessionFilterChange,
  sessionCounts,
}: GroupFiltersProps) {
  const { t, language } = useLanguage();
  const hasLocations = (locationOptions && locationOptions.length > 0) || locations.length > 0;

  const statusTabs: Array<{ label: string; value: GroupStatus | 'All' }> = [
    { label: t('common.all'), value: 'All' },
    { label: t('groups.statusDraft'), value: 'Draft' },
    { label: t('groups.statusActive'), value: 'Active' },
    { label: t('groups.statusCompleted'), value: 'Completed' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Search & Location Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <div className="flex-1 min-w-0">
          <Input
            id="group-search"
            placeholder={t('groups.searchPlaceholder')}
            value={filters.search || ''}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
            leftElement={<Search className="h-4 w-4" />}
          />
        </div>

        {hasLocations ? (
          <div className="sm:w-64 min-w-0">
            <Select
              id="group-location-filter"
              value={filters.location || ''}
              onChange={(e) =>
                onFilterChange({ ...filters, location: e.target.value })
              }
              leftElement={<MapPin className="h-4 w-4" />}
            >
              <option value="">
                {t('groups.allLocations')} ({locationOptions?.length ?? locations.length})
              </option>
              {locationOptions
                ? locationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
                : locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
            </Select>
          </div>
        ) : null}
      </div>

      {/* Filter Pills Row: Status & Route Session */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scroll-smooth">
          {statusTabs.map((tab) => {
            const isSelected = (filters.status || 'All') === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() =>
                  onFilterChange({ ...filters, status: tab.value })
                }
                className={cn(
                  'inline-flex min-h-[34px] flex-shrink-0 items-center rounded-lg px-3 py-1',
                  'text-xs font-medium transition-colors whitespace-nowrap',
                  isSelected
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-surface text-secondary-600 border border-border hover:bg-secondary-50 hover:text-secondary-900',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Route Session Filter Segment */}
        {onSessionFilterChange && (
          <div className="flex items-center gap-1 bg-secondary-100/90 p-1 rounded-lg border border-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onSessionFilterChange('all')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap',
                sessionFilter === 'all'
                  ? 'bg-surface text-secondary-900 shadow-xs'
                  : 'text-secondary-600 hover:text-secondary-900',
              )}
            >
              {language === 'ta' ? 'அனைத்து வழித்தடங்கள்' : 'All Routes'} {sessionCounts ? `(${sessionCounts.all})` : ''}
            </button>
            <button
              type="button"
              onClick={() => onSessionFilterChange('morning')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap',
                sessionFilter === 'morning'
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'text-amber-800 hover:bg-amber-100/70',
              )}
            >
              <Sun className="h-3 w-3" />
              {language === 'ta' ? 'காலை' : 'Morning'} {sessionCounts ? `(${sessionCounts.morning})` : ''}
            </button>
            <button
              type="button"
              onClick={() => onSessionFilterChange('evening')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap',
                sessionFilter === 'evening'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-indigo-800 hover:bg-indigo-100/70',
              )}
            >
              <Moon className="h-3 w-3" />
              {language === 'ta' ? 'மாலை' : 'Evening'} {sessionCounts ? `(${sessionCounts.evening})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


