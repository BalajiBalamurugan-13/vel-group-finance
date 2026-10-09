import { useMemo } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { Users } from 'lucide-react';
import { usePlacesRoute, buildPlaceLookupMap } from '@/features/places';
import { GroupCard } from './GroupCard';
import { GroupTable } from './GroupTable';
import type { Group, GroupStatus } from '../types';

interface GroupListProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onRequestStatusChange: (group: Group, targetStatus: GroupStatus) => void;
  onCreateNew?: () => void;
}

export function GroupList({
  groups,
  onEdit,
  onRequestStatusChange,
  onCreateNew,
}: GroupListProps) {
  const { places } = usePlacesRoute();
  const placeLookup = useMemo(() => buildPlaceLookupMap(places), [places]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<Users className="w-12 h-12 text-secondary-300" />}
        title="No groups found"
        description="No finance groups match the selected criteria. Create a new group to get started."
        action={
          onCreateNew ? (
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              Create Group
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      {/* Mobile view (< md breakpoint): Cards */}
      <div className="grid gap-3 sm:grid-cols-2 md:hidden">
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onEdit={onEdit}
            onRequestStatusChange={onRequestStatusChange}
            formatMoney={formatMoney}
            places={places}
            placeLookup={placeLookup}
          />
        ))}
      </div>

      {/* Desktop view (>= md breakpoint): Table */}
      <div className="hidden md:block">
        <GroupTable
          groups={groups}
          onEdit={onEdit}
          onRequestStatusChange={onRequestStatusChange}
          formatMoney={formatMoney}
          places={places}
          placeLookup={placeLookup}
        />
      </div>
    </>
  );
}
