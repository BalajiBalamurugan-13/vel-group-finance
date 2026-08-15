import { useState } from 'react';
import { useSchemes } from '@/features/schemes/hooks/useSchemes';
import { SchemeList } from '@/features/schemes/components/SchemeList';
import { SchemeFormModal } from '@/features/schemes/components/SchemeFormModal';
import { UpdateSchemeFormModal } from '@/features/schemes/components/UpdateSchemeFormModal';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import type { Scheme } from '@/features/schemes/types';

export function SchemesPage() {
  const { data: schemes, isLoading, error } = useSchemes();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);

  if (error) {
    throw error; // Let ErrorBoundary handle it
  }

  return (
    <PageContainer>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-secondary-900 break-words">
            Scheme Management
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            Manage financial schemes used for creating groups.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            New Scheme
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <SchemeList
          schemes={schemes || []}
          onEdit={setEditingScheme}
        />
      )}

      {/* Modals */}
      <SchemeFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      
      <UpdateSchemeFormModal
        scheme={editingScheme}
        isOpen={!!editingScheme}
        onClose={() => setEditingScheme(null)}
      />
    </PageContainer>
  );
}
