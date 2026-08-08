/**
 * VEL Finance — Settings Page (Placeholder)
 * Business UI: NOT YET IMPLEMENTED
 */
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useDocumentTitle } from '@/hooks';
import { Settings } from 'lucide-react';

export function SettingsPage() {
  useDocumentTitle('Settings');

  return (
    <PageContainer>
      <PageHeader title="Settings" subtitle="Configure application settings and preferences...." />
      <EmptyState
        icon={<Settings className="w-12 h-12 text-secondary-300" />}
        title="Settings is under development"
        description="Configure application settings and preferences."
      />
    </PageContainer>
  );
}
