import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { useDocumentTitle } from '@/hooks';
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

export function CollectionsPage() {
  useDocumentTitle('Collections | VEL Finance');

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
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <PageHeader
        title="Weekly Collections"
        subtitle="Record customer weekly payments, track installment cash inflows, and review outstanding amounts."
        action={
          <Button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center gap-2 min-h-[44px] px-4 font-semibold shadow-xs"
            aria-label="Record Weekly Collection Payment"
          >
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        }
      />

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      <CollectionSummaryCards
        todaySummary={todaySummary}
        weeklySummary={weeklySummary}
        isLoading={isLoadingToday || isLoadingWeekly}
      />

      {/* ── Search & Filter Controls ────────────────────────────────────────── */}
      <CollectionFilters
        filters={filters}
        groups={groups}
        onFilterChange={setFilters}
      />

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
      />

      {/* ── Collection Details Modal ─────────────────────────────────────────── */}
      <CollectionDetailsModal
        collection={selectedCollection}
        isOpen={Boolean(selectedCollection)}
        onClose={() => setSelectedCollection(null)}
      />
    </div>
  );
}

export default CollectionsPage;
