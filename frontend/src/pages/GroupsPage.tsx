/**
 * VEL Finance — Groups Page (Placeholder)
 * Business UI: NOT YET IMPLEMENTED
 */
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useDocumentTitle } from '@/hooks';
import { Users } from 'lucide-react';

export function GroupsPage() {
  useDocumentTitle('Groups');

  return (
    <PageContainer>
      <PageHeader title="Groups" subtitle="Create and manage finance groups, track group prog..." />
      <EmptyState
        icon={<Users className="w-12 h-12 text-secondary-300" />}
        title="Groups is under development"
        description="Create and manage finance groups, track group progress, and view group statistics."
      />
    </PageContainer>
  );
}
