/**
 * VEL Finance — Reports Page (Placeholder)
 * Business UI: NOT YET IMPLEMENTED
 */
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useDocumentTitle } from '@/hooks';
import { BarChart3 } from 'lucide-react';

export function ReportsPage() {
  useDocumentTitle('Reports');

  return (
    <PageContainer>
      <PageHeader title="Reports" subtitle="View group reports, member reports, outstanding re..." />
      <EmptyState
        icon={<BarChart3 className="w-12 h-12 text-secondary-300" />}
        title="Reports is under development"
        description="View group reports, member reports, outstanding reports, and cash summary."
      />
    </PageContainer>
  );
}
