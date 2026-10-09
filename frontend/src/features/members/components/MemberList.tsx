import { useMemo } from 'react';
import { Plus, UserX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { usePlacesRoute, buildPlaceLookupMap } from '@/features/places';
import { MemberTable } from './MemberTable';
import { MemberCard } from './MemberCard';
import type { Member, MemberStatus } from '../types';

interface MemberListProps {
  members: Member[];
  onViewDetails: (member: Member) => void;
  onEdit: (member: Member) => void;
  onRequestStatusChange: (member: Member, targetStatus: MemberStatus) => void;
  onCreateNew: () => void;
}

export function MemberList({
  members,
  onViewDetails,
  onEdit,
  onRequestStatusChange,
  onCreateNew,
}: MemberListProps) {
  const { places } = usePlacesRoute();
  const placeLookup = useMemo(() => buildPlaceLookupMap(places), [places]);

  if (members.length === 0) {
    return (
      <EmptyState
        icon={<UserX className="h-8 w-8 text-secondary-400" />}
        title="No members found"
        description="Get started by adding a member to an active or draft group."
        action={
          <Button
            variant="primary"
            onClick={onCreateNew}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Member
          </Button>
        }
      />
    );
  }

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block">
        <MemberTable
          members={members}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          onRequestStatusChange={onRequestStatusChange}
          places={places}
          placeLookup={placeLookup}
        />
      </div>

      {/* Mobile View */}
      <div className="grid gap-3 md:hidden">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onViewDetails={onViewDetails}
            onEdit={onEdit}
            onRequestStatusChange={onRequestStatusChange}
            places={places}
            placeLookup={placeLookup}
          />
        ))}
      </div>
    </>
  );
}
