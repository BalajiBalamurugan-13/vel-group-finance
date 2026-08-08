/**
 * VEL Finance — Members Page (Placeholder)
 * Business UI: NOT YET IMPLEMENTED
 */
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useDocumentTitle } from '@/hooks';
import { UserCheck } from 'lucide-react';

export function MembersPage() {
  useDocumentTitle('Members');

  return (
    <PageContainer>
      <PageHeader title="Members" subtitle="Add and manage group members, view loan history, a..." />
      <EmptyState
        icon={<UserCheck className="w-12 h-12 text-secondary-300" />}
        title="Members is under development"
        description="Add and manage group members, view loan history, and track outstanding balances."
      />
    </PageContainer>
  );
}
