import { useState } from 'react';
import { useSchemes } from '@/features/schemes/hooks/useSchemes';
import { SchemeList } from '@/features/schemes/components/SchemeList';
import { SchemeFormModal } from '@/features/schemes/components/SchemeFormModal';
import { UpdateSchemeFormModal } from '@/features/schemes/components/UpdateSchemeFormModal';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/i18n';
import type { Scheme } from '@/features/schemes/types';

export function SchemesPage() {
  const { t } = useLanguage();
  const { data: schemes, isLoading, error } = useSchemes();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);

  if (error) {
    throw error; // Let ErrorBoundary handle it
  }

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-secondary-900">
          {t('schemes.title')}
        </h1>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          {t('schemes.newScheme')}
        </Button>
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
