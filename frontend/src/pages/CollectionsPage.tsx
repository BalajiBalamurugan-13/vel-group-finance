import { useState, useMemo } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { TOAST_DURATION_MS } from '@/constants/app';
import { useDocumentTitle } from '@/hooks';
import { formatCurrency } from '@/utils/format';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useLanguage } from '@/i18n';
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
  const { t } = useLanguage();
  useDocumentTitle(`${t('collections.title')} | VEL Finance`);

  // Toast State
  const [successToast, setSuccessToast] = useState<ToastState | null>(null);

  // Filter State
  const [filters, setFilters] = useState<CollectionFiltersState>({});

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

  // Queries
  const { data: groups = [] } = useGroups();
  const {
    data: collections = [],
    isLoading: isLoadingCollections,
    refetch: refetchCollections,
    isFetching: isFetchingCollections,
  } = useCollections(filters);
  const { data: todaySummary, isLoading: isLoadingToday } =
    useTodayCollections();
  const { data: weeklySummary, isLoading: isLoadingWeekly } =
    useWeeklyCollectionSummary(filters.group_id);

  const selectedGroup = useMemo(() => {
    if (!filters.group_id) return null;
    return groups.find((g) => g.id === filters.group_id);
  }, [filters.group_id, groups]);

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
          duration={TOAST_DURATION_MS}
          onClose={() => setSuccessToast(null)}
        />
      )}

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-secondary-900">
            {t('collections.title')}
          </h1>
          <p className="text-xs text-secondary-500 mt-0.5">
            {t('collections.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchCollections()}
            disabled={isFetchingCollections}
            aria-label={t('common.refresh')}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetchingCollections ? 'animate-spin text-primary-500' : 'text-secondary-500'}`}
              aria-hidden="true"
            />
            <span className="ml-1.5 text-xs text-secondary-600 font-medium">
              {t('common.refresh')}
            </span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsRecordModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            aria-label={t('dashboard.recordPayment')}
          >
            {t('dashboard.recordPayment')}
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      <CollectionSummaryCards
        todaySummary={todaySummary}
        weeklySummary={weeklySummary}
        isLoading={isLoadingToday || isLoadingWeekly}
        selectedGroupName={selectedGroup?.group_name}
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

      {/* ── Mobile Floating Action Button (FAB) for Record Payment ────── */}
      <button
        type="button"
        onClick={() => setIsRecordModalOpen(true)}
        className="fixed md:hidden z-30 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl hover:bg-primary-700 active:scale-95 transition-all"
        aria-label="Record Weekly Collection Payment"
      >
        <Plus className="h-4 w-4" />
        <span>Record Payment</span>
      </button>

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
