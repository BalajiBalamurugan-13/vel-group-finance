import { useState, useMemo } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { TOAST_DURATION_MS } from '@/constants/app';
import { useDocumentTitle } from '@/hooks';
import { Plus } from 'lucide-react';
import { useGroups } from '@/features/groups/hooks/useGroups';
import {
  usePlacesRoute,
  sortGroupsByRoute,
  sortMembersByRoute,
  buildRouteGroupOptgroups,
  buildPlaceLookupMap,
  resolvePlaceRouteInfo,
} from '@/features/places';
import {
  useMembers,
  useUpdateMemberStatus,
  MemberList,
  MemberFilters,
  MemberFormModal,
  UpdateMemberFormModal,
  MemberDetailsModal,
  MemberStatusConfirmModal,
  type Member,
  type MemberFiltersState,
  type MemberStatus,
} from '@/features/members';
import { useLanguage } from '@/i18n';

interface ToastState {
  message: string;
  description?: string;
}

export function MembersPage() {
  const { t } = useLanguage();
  useDocumentTitle(t('members.title'));

  const [filters, setFilters] = useState<MemberFiltersState>({
    status: 'All',
    group_id: 'All',
    search: '',
  });

  const [sessionFilter, setSessionFilter] = useState<'all' | 'morning' | 'evening'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [detailsMember, setDetailsMember] = useState<Member | null>(null);
  const [statusConfirmState, setStatusConfirmState] = useState<{
    member: Member | null;
    targetStatus: MemberStatus | null;
  }>({
    member: null,
    targetStatus: null,
  });
  const [successToast, setSuccessToast] = useState<ToastState | null>(null);

  const { data: members = [], isLoading: isMembersLoading, error } = useMembers(filters);
  const { data: groups = [] } = useGroups();
  const { places } = usePlacesRoute();
  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useUpdateMemberStatus();

  // Sort groups strictly by configured Places & Routes order
  const sortedGroups = useMemo(() => {
    return sortGroupsByRoute(groups, places);
  }, [groups, places]);

  // Build structured optgroups for dropdown
  const groupOptgroups = useMemo(() => {
    return buildRouteGroupOptgroups(sortedGroups, places);
  }, [sortedGroups, places]);

  // Compute session counts for all loaded members
  const sessionCounts = useMemo(() => {
    const lookup = buildPlaceLookupMap(places);
    const groupMap = new Map(groups.map((g) => [g.id, g]));
    let morning = 0;
    let evening = 0;

    for (const m of members) {
      const g = m.group_id ? groupMap.get(m.group_id) : null;
      const loc = g?.location || m.location;
      const gName = g?.group_name || m.group_name;
      const info = resolvePlaceRouteInfo(loc, gName, lookup, places);
      if (info.session === 'evening') {
        evening++;
      } else {
        morning++;
      }
    }

    return {
      all: members.length,
      morning,
      evening,
    };
  }, [members, groups, places]);

  // Sort members strictly by route sequence (Morning -> Evening, Route Stop 1..N, Group, Member)
  const sortedMembers = useMemo(() => {
    const sorted = sortMembersByRoute(members, groups, places);
    if (sessionFilter === 'all') return sorted;
    const lookup = buildPlaceLookupMap(places);
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    return sorted.filter((m) => {
      const g = m.group_id ? groupMap.get(m.group_id) : null;
      const loc = g?.location || m.location;
      const gName = g?.group_name || m.group_name;
      const info = resolvePlaceRouteInfo(loc, gName, lookup, places);
      return info.session === sessionFilter;
    });
  }, [members, groups, places, sessionFilter]);

  if (error) {
    throw error;
  }

  const handleRequestStatusChange = (
    member: Member,
    targetStatus: MemberStatus,
  ) => {
    setStatusConfirmState({ member, targetStatus });
  };

  const handleConfirmStatusChange = async (
    member: Member,
    newStatus: MemberStatus,
  ) => {
    await updateStatus({
      id: member.id,
      payload: { status: newStatus },
    });
  };

  return (
    <PageContainer>
      {/* Success Toast */}
      {successToast && (
        <Toast
          message={successToast.message}
          description={successToast.description}
          variant="success"
          duration={TOAST_DURATION_MS}
          onClose={() => setSuccessToast(null)}
        />
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-secondary-900">
          {t('members.title')}
        </h1>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          {t('members.newMember')}
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="mb-4">
        <MemberFilters
          filters={filters}
          onFilterChange={setFilters}
          groups={sortedGroups}
          groupOptgroups={groupOptgroups}
          sessionFilter={sessionFilter}
          onSessionFilterChange={setSessionFilter}
          sessionCounts={sessionCounts}
        />
      </div>

      {/* Member List (Desktop Table / Mobile Cards) */}
      {isMembersLoading ? (
        <LoadingState />
      ) : (
        <MemberList
          members={sortedMembers}
          onViewDetails={setDetailsMember}
          onEdit={setEditingMember}
          onRequestStatusChange={handleRequestStatusChange}
          onCreateNew={() => setIsCreateOpen(true)}
        />
      )}

      {/* Modals */}
      <MemberFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultGroupId={
          filters.group_id && filters.group_id !== 'All'
            ? filters.group_id
            : undefined
        }
        onSuccess={(memberName) => {
          setSuccessToast({
            message: 'Member Added',
            description: `${memberName} was added successfully.`,
          });
        }}
      />

      <UpdateMemberFormModal
        member={editingMember}
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        onSuccess={(memberName) => {
          setSuccessToast({
            message: 'Member Profile Saved',
            description: `${memberName || 'Member'} details saved successfully.`,
          });
        }}
      />

      <MemberDetailsModal
        member={detailsMember}
        isOpen={Boolean(detailsMember)}
        onClose={() => setDetailsMember(null)}
        onEdit={(m) => {
          setDetailsMember(null);
          setEditingMember(m);
        }}
      />

      <MemberStatusConfirmModal
        member={statusConfirmState.member}
        targetStatus={statusConfirmState.targetStatus}
        isOpen={Boolean(
          statusConfirmState.member && statusConfirmState.targetStatus,
        )}
        onClose={() =>
          setStatusConfirmState({ member: null, targetStatus: null })
        }
        onConfirm={handleConfirmStatusChange}
        isLoading={isUpdatingStatus}
      />
    </PageContainer>
  );
}

export default MembersPage;
