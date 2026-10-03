import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { TOAST_DURATION_MS } from '@/constants/app';
import { useDocumentTitle } from '@/hooks';
import { Plus } from 'lucide-react';
import {
  usePlacesRoute,
  sortGroupsByRoute,
  buildPlaceLookupMap,
  resolvePlaceRouteInfo,
} from '@/features/places';
import {
  useGroups,
  useUpdateGroupStatus,
  GroupList,
  GroupFilters,
  GroupFormModal,
  UpdateGroupFormModal,
  GroupStatusConfirmModal,
  type Group,
  type GroupFiltersState,
  type GroupStatus,
} from '@/features/groups';

interface ToastState {
  message: string;
  description?: string;
}

export function GroupsPage() {
  useDocumentTitle('Groups');

  const [searchParams] = useSearchParams();
  const locationParam = searchParams.get('location') || '';

  const [filters, setFilters] = useState<GroupFiltersState>({
    status: 'All',
    location: locationParam,
    search: '',
  });

  const [sessionFilter, setSessionFilter] = useState<'all' | 'morning' | 'evening'>('all');

  useEffect(() => {
    if (locationParam) {
      setFilters((prev) => ({ ...prev, location: locationParam }));
    }
  }, [locationParam]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [statusConfirmState, setStatusConfirmState] = useState<{
    group: Group | null;
    targetStatus: GroupStatus | null;
  }>({
    group: null,
    targetStatus: null,
  });
  const [successToast, setSuccessToast] = useState<ToastState | null>(null);

  const { data: groups = [], isLoading: isGroupsLoading, error } = useGroups(filters);
  const { places } = usePlacesRoute();
  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useUpdateGroupStatus();

  // Extract unique locations from loaded groups, ordered strictly by configured route sequence
  const locationOptions = useMemo(() => {
    const lookup = buildPlaceLookupMap(places);
    const locationSet = new Set<string>();
    if (filters.location?.trim()) {
      locationSet.add(filters.location.trim());
    }
    groups.forEach((g) => {
      if (g.location?.trim()) {
        locationSet.add(g.location.trim());
      }
    });

    const mapped = Array.from(locationSet).map((loc) => {
      const info = resolvePlaceRouteInfo(loc, null, lookup, places);
      const sessionIcon = info.session === 'morning' ? '☀️' : '🌙';
      const stopNum = info.order < 9000 ? `#${info.order} ` : '';
      return {
        value: loc,
        label: `${sessionIcon} ${stopNum}${loc}`,
        session: info.session,
        order: info.order,
      };
    });

    mapped.sort((a, b) => {
      const sA = a.session === 'morning' ? 0 : 1;
      const sB = b.session === 'morning' ? 0 : 1;
      if (sA !== sB) return sA - sB;
      if (a.order !== b.order) return a.order - b.order;
      return a.value.localeCompare(b.value);
    });

    return mapped;
  }, [groups, filters.location, places]);

  // Compute session counts for loaded groups
  const sessionCounts = useMemo(() => {
    const lookup = buildPlaceLookupMap(places);
    let morning = 0;
    let evening = 0;
    for (const g of groups) {
      const info = resolvePlaceRouteInfo(g.location, g.group_name, lookup, places);
      if (info.session === 'evening') evening++;
      else morning++;
    }
    return { all: groups.length, morning, evening };
  }, [groups, places]);

  // Sort groups strictly by configured route sequence & filter by active session
  const sortedGroups = useMemo(() => {
    const sorted = sortGroupsByRoute(groups, places);
    if (sessionFilter === 'all') return sorted;
    const lookup = buildPlaceLookupMap(places);
    return sorted.filter((g) => {
      const info = resolvePlaceRouteInfo(g.location, g.group_name, lookup, places);
      return info.session === sessionFilter;
    });
  }, [groups, places, sessionFilter]);

  if (error) {
    throw error; // Caught by ErrorBoundary
  }

  const handleRequestStatusChange = (
    group: Group,
    targetStatus: GroupStatus,
  ) => {
    setStatusConfirmState({ group, targetStatus });
  };

  const handleConfirmStatusChange = async (
    group: Group,
    newStatus: GroupStatus,
  ) => {
    await updateStatus({
      id: group.id,
      payload: { status: newStatus },
    });
    if (newStatus === 'Active') {
      setSuccessToast({
        message: 'Group Activated',
        description: `${group.group_name} is now active. Loans have been disbursed to all members.`,
      });
    } else if (newStatus === 'Completed') {
      setSuccessToast({
        message: 'Group Completed',
        description: `${group.group_name} has been marked as completed.`,
      });
    }
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
          Groups
        </h1>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          New Group
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="mb-4">
        <GroupFilters
          filters={filters}
          onFilterChange={setFilters}
          locationOptions={locationOptions}
          sessionFilter={sessionFilter}
          onSessionFilterChange={setSessionFilter}
          sessionCounts={sessionCounts}
        />
      </div>

      {/* Group List (Desktop Table / Mobile Cards) */}
      {isGroupsLoading ? (
        <LoadingState />
      ) : (
        <GroupList
          groups={sortedGroups}
          onEdit={setEditingGroup}
          onRequestStatusChange={handleRequestStatusChange}
          onCreateNew={() => setIsCreateOpen(true)}
        />
      )}

      {/* Modals */}
      <GroupFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(group) => {
          setSuccessToast({
            message: 'Group Created',
            description: group.group_code
              ? `${group.group_name} (${group.group_code}) was created successfully.`
              : `${group.group_name} was created successfully.`,
          });
        }}
      />

      <UpdateGroupFormModal
        group={editingGroup}
        isOpen={Boolean(editingGroup)}
        onClose={() => setEditingGroup(null)}
      />

      <GroupStatusConfirmModal
        group={statusConfirmState.group}
        targetStatus={statusConfirmState.targetStatus}
        isOpen={Boolean(statusConfirmState.group && statusConfirmState.targetStatus)}
        onClose={() =>
          setStatusConfirmState({ group: null, targetStatus: null })
        }
        onConfirm={handleConfirmStatusChange}
        isLoading={isUpdatingStatus}
      />
    </PageContainer>
  );
}
