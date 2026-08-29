/**
 * VEL Finance — Dashboard Groups by Location Component
 * ======================================================
 * Renders a compact table / card list of active groups
 * grouped by business location.
 * On mobile the table transforms into stacked cards.
 */
import type { GroupLocationSummary } from '../types';
import { MapPin, Layers, Users } from 'lucide-react';
import { cn } from '@/lib/cn';

interface GroupLocationListProps {
  locations: GroupLocationSummary[];
}

export function GroupLocationList({ locations }: GroupLocationListProps) {
  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-secondary-400">
        <MapPin className="h-8 w-8 mb-2 opacity-50" aria-hidden="true" />
        <p className="text-sm">No active groups yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm" aria-label="Active groups by location">
          <thead>
            <tr className="border-b border-border bg-secondary-50/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wide">
                Location
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wide">
                Active Groups
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wide">
                Active Members
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {locations.map((loc) => (
              <tr
                key={loc.location}
                className="hover:bg-secondary-50/40 transition-colors duration-150"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary-500 flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium text-secondary-800">{loc.location}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-secondary-700">
                    <Layers className="h-3.5 w-3.5 text-secondary-400" aria-hidden="true" />
                    {loc.active_groups}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-secondary-700">
                    <Users className="h-3.5 w-3.5 text-secondary-400" aria-hidden="true" />
                    {loc.active_members}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden divide-y divide-border">
        {locations.map((loc) => (
          <div key={loc.location} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-lg bg-primary-100">
              <MapPin className="h-4 w-4 text-primary-600" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-secondary-800 truncate">{loc.location}</p>
              <p className="text-xs text-secondary-500 mt-0.5">
                {loc.active_groups} {loc.active_groups === 1 ? 'group' : 'groups'} ·{' '}
                {loc.active_members} {loc.active_members === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Colour pill helper for location badges used elsewhere */
export function LocationPill({
  location,
  className,
}: {
  location: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200',
        className,
      )}
    >
      <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
      {location}
    </span>
  );
}
