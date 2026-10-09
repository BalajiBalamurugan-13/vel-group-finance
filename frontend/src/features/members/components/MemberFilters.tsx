import { Search, Users, Sun, Moon } from 'lucide-react';
import { Input, Select } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/i18n';
import type { MemberFiltersState, MemberStatus } from '../types';
import type { RouteOptGroup, RouteSortableGroup } from '@/features/places';

export interface MemberFiltersProps {
  filters: MemberFiltersState;
  onFilterChange: (filters: MemberFiltersState) => void;
  groups?: Array<{ id: string; group_name: string; location?: string }>;
  groupOptgroups?: Array<RouteOptGroup<RouteSortableGroup & { id: string }>>;
  sessionFilter?: 'all' | 'morning' | 'evening';
  onSessionFilterChange?: (session: 'all' | 'morning' | 'evening') => void;
  sessionCounts?: { all: number; morning: number; evening: number };
}

export function MemberFilters({
  filters,
  onFilterChange,
  groups = [],
  groupOptgroups = [],
  sessionFilter = 'all',
  onSessionFilterChange,
  sessionCounts,
}: MemberFiltersProps) {
  const { language } = useLanguage();

  const statusTabs: Array<{ label: string; value: MemberStatus | 'All' }> = [
    { label: language === 'ta' ? 'அனைத்தும்' : 'All', value: 'All' },
    { label: language === 'ta' ? 'செயலில்' : 'Active', value: 'Active' },
    { label: language === 'ta' ? 'முடிந்தது' : 'Completed', value: 'Completed' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Search & Group Filter Row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <div className="flex-1 min-w-0">
          <Input
            id="member-search"
            placeholder={language === 'ta' ? 'பெயர் அல்லது எண் மூலம் தேடவும்...' : 'Search by name or phone...'}
            value={filters.search || ''}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
            leftElement={<Search className="h-4 w-4" />}
          />
        </div>

        {groups.length > 0 && (
          <div className="sm:w-72 min-w-0">
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
              <option value="All">
                {language === 'ta' ? 'அனைத்து குழுக்கள்' : 'All Groups'} ({groups.length})
              </option>
              {groupOptgroups && groupOptgroups.length > 0 ? (
                groupOptgroups.map((og) => (
                  <optgroup key={og.label} label={og.label}>
                    {og.options.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.group_name} {g.location ? `(${g.location})` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))
              ) : (
                groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.group_name} {g.location ? `(${g.location})` : ''}
                  </option>
                ))
              )}
            </Select>
          </div>
        )}
      </div>

      {/* Filter Pills Row: Lifecycle Status + Route Session */}
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
                  onFilterChange({
                    ...filters,
                    status: tab.value === 'All' ? undefined : (tab.value as MemberStatus),
                  })
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
                  : 'text-secondary-600 hover:text-secondary-900'
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
                  : 'text-amber-800 hover:bg-amber-100/70'
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
                  : 'text-indigo-800 hover:bg-indigo-100/70'
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
