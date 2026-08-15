/**
 * VEL Finance - Groups Page (Placeholder)
 * Business UI: NOT YET IMPLEMENTED
 */
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useDocumentTitle } from '@/hooks';
import { Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';

export function GroupsPage() {
  useDocumentTitle('Groups');
  const navigate = useNavigate();

  return (
    <PageContainer>
      <PageHeader 
        title="Groups" 
        subtitle="Create and manage finance groups, track group progress" 
        action={
          <Button 
            variant="outline" 
            leftIcon={<UserCheck className="w-4 h-4" />}
            onClick={() => navigate(ROUTES.MEMBERS)}
            className="md:hidden"
          >
            Manage Members
          </Button>
        }
      />
      <EmptyState
        icon={<Users className="w-12 h-12 text-secondary-300" />}
        title="Groups is under development"
        description="Create and manage finance groups, track group progress, and view group statistics."
      />
    </PageContainer>
  );
}
