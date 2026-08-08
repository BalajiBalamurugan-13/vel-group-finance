/**
 * VEL Finance — Collections Page (Placeholder)
 * Business UI: NOT YET IMPLEMENTED
 */
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useDocumentTitle } from '@/hooks';
import { Wallet } from 'lucide-react';

export function CollectionsPage() {
  useDocumentTitle('Collections');

  return (
    <PageContainer>
      <PageHeader title="Collections" subtitle="Record weekly collections, view pending payments, ..." />
      <EmptyState
        icon={<Wallet className="w-12 h-12 text-secondary-300" />}
        title="Collections is under development"
        description="Record weekly collections, view pending payments, and track collection history."
      />
    </PageContainer>
  );
}
