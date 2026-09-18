import { useState, useMemo } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { useDocumentTitle } from '@/hooks';
import { Plus } from 'lucide-react';
import { useGroups } from '@/features/groups/hooks/useGroups';
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

interface ToastState {
  message: string;
  description?: string;
}

export function MembersPage() {
  useDocumentTitle('Members');

  const [filters, setFilters] = useState<MemberFiltersState>({
    status: 'All',
    group_id: 'All',
    search: '',
  });

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

  const { data: members = [], isLoading, error } = useMembers(filters);
  const { data: groups = [] } = useGroups();
  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useUpdateMemberStatus();

  // Extract unique group options for filter dropdown
  const groupOptions = useMemo(() => {
    return groups.map((g) => ({
      id: g.id,
      group_name: g.group_name,
      location: g.location,
    }));
  }, [groups]);

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
          duration={1800}
          onClose={() => setSuccessToast(null)}
        />
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-secondary-900">
          Members
        </h1>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          New Member
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="mb-4">
        <MemberFilters
          filters={filters}
          onFilterChange={setFilters}
          groups={groupOptions}
        />
      </div>

      {/* Member List (Desktop Table / Mobile Cards) */}
      {isLoading ? (
        <LoadingState />
      ) : (
        <MemberList
          members={members}
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
        onSuccess={() => {
          setSuccessToast({
            message: 'Member Updated',
            description: 'Member details saved successfully.',
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
