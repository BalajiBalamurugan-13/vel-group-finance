/**
 * VEL Finance — Dashboard Page (Placeholder)
 * Business UI: NOT YET IMPLEMENTED
 */
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useDocumentTitle } from '@/hooks';
import { LayoutDashboard } from 'lucide-react';

export function DashboardPage() {
  useDocumentTitle('Dashboard');

  return (
    <PageContainer>
      <PageHeader title="Dashboard" subtitle="Business overview and key metrics" />
      <EmptyState
        icon={<LayoutDashboard className="w-12 h-12 text-secondary-300" />}
        title="Dashboard is under development"
        description="Business summary, today's collections, cash position, and group statistics will be displayed here."
      />
    </PageContainer>
  );
}
