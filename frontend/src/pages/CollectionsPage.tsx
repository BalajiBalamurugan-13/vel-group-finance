import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { useDocumentTitle } from '@/hooks';
import { formatCurrency } from '@/utils/format';
import { useGroups } from '@/features/groups/hooks/useGroups';
import {
  CollectionList,
  CollectionSummaryCards,
  CollectionFilters,
  RecordPaymentModal,
  CollectionDetailsModal,
  useCollections,
  useTodayCollections,
  useWeeklyCollectionSummary,
  type Collection,
  type CollectionFiltersState,
} from '@/features/collections';

interface ToastState {
  message: string;
  description?: string;
}

export function CollectionsPage() {
  useDocumentTitle('Collections | VEL Finance');

  // Toast State
  const [successToast, setSuccessToast] = useState<ToastState | null>(null);

  // Filter State
  const [filters, setFilters] = useState<CollectionFiltersState>({});

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

  // Queries
  const { data: groups = [] } = useGroups();
  const { data: collections = [], isLoading: isLoadingCollections } =
    useCollections(filters);
  const { data: todaySummary, isLoading: isLoadingToday } =
    useTodayCollections();
  const { data: weeklySummary, isLoading: isLoadingWeekly } =
    useWeeklyCollectionSummary(filters.group_id);

  // Filter collections by client-side search query (member name, group name, phone)
  const filteredCollections = collections.filter((c) => {
    if (!filters.search) return true;
    const term = filters.search.toLowerCase();
    const memberMatch = c.member_name?.toLowerCase().includes(term);
    const groupMatch = c.group_name?.toLowerCase().includes(term);
    const phoneMatch = c.phone_number?.includes(term);
    return memberMatch || groupMatch || phoneMatch;
  });

  return (
    <PageContainer>
      {/* ── Success Toast ────────────────────────────────────────────────────── */}
      {successToast && (
        <Toast
          message={successToast.message}
          description={successToast.description}
          variant="success"
          duration={1800}
          onClose={() => setSuccessToast(null)}
        />
      )}

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-secondary-900">
          Weekly Collections
        </h1>
        <Button
          size="sm"
          onClick={() => setIsRecordModalOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
          aria-label="Record Weekly Collection Payment"
        >
          Record Payment
        </Button>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      <CollectionSummaryCards
        todaySummary={todaySummary}
        weeklySummary={weeklySummary}
        isLoading={isLoadingToday || isLoadingWeekly}
      />

      {/* ── Search & Filter Controls ────────────────────────────────────────── */}
      <div className="mt-4">
        <CollectionFilters
          filters={filters}
          groups={groups}
          onFilterChange={setFilters}
        />
      </div>

      {/* ── Collections List (Table / Mobile Cards) ─────────────────────────── */}
      <CollectionList
        collections={filteredCollections}
        isLoading={isLoadingCollections}
        onRecordPayment={() => setIsRecordModalOpen(true)}
        onViewDetails={(collection) => setSelectedCollection(collection)}
      />

      {/* ── Record Payment Modal ─────────────────────────────────────────────── */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={({ week, memberName, amount }) => {
          setSuccessToast({
            message: 'Payment Recorded',
            description: `Week ${week} • ${memberName} • ${formatCurrency(amount)}`,
          });
        }}
      />

      {/* ── Collection Details Modal ─────────────────────────────────────────── */}
      <CollectionDetailsModal
        collection={selectedCollection}
        isOpen={Boolean(selectedCollection)}
        onClose={() => setSelectedCollection(null)}
      />
    </PageContainer>
  );
}

export default CollectionsPage;
