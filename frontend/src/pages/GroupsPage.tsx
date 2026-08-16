import { useState, useMemo } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/Button';
import { useDocumentTitle } from '@/hooks';
import { Plus } from 'lucide-react';
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

export function GroupsPage() {
  useDocumentTitle('Groups');

  const [filters, setFilters] = useState<GroupFiltersState>({
    status: 'All',
    location: '',
    search: '',
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [statusConfirmState, setStatusConfirmState] = useState<{
    group: Group | null;
    targetStatus: GroupStatus | null;
  }>({
    group: null,
    targetStatus: null,
  });

  const { data: groups = [], isLoading, error } = useGroups(filters);
  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useUpdateGroupStatus();

  // Extract unique locations from loaded groups for quick filter dropdown
  const locations = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      if (g.location?.trim()) {
        set.add(g.location.trim());
      }
    });
    return Array.from(set).sort();
  }, [groups]);

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
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-secondary-900 break-words">
            Groups
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            Create and manage finance groups, assign schemes, and track progress.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            New Group
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mb-6">
        <GroupFilters
          filters={filters}
          onFilterChange={setFilters}
          locations={locations}
        />
      </div>

      {/* Group List (Desktop Table / Mobile Cards) */}
      {isLoading ? (
        <LoadingState />
      ) : (
        <GroupList
          groups={groups}
          onEdit={setEditingGroup}
          onRequestStatusChange={handleRequestStatusChange}
          onCreateNew={() => setIsCreateOpen(true)}
        />
      )}

      {/* Modals */}
      <GroupFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
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
