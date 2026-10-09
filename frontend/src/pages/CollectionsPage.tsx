import { useState, useMemo } from 'react';
import { Plus, RefreshCw, Zap } from 'lucide-react';
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
  RecordWholeWeekModal,
  CollectionDetailsModal,
  useCollections,
  useWeeklyCollectionSummary,
  type Collection,
  type CollectionFiltersState,
} from '@/features/collections';

interface ToastState {
  message: string;
  description?: string;
}

export function CollectionsPage() {
  const { t, language } = useLanguage();
  useDocumentTitle(`${t('collections.title')} | VEL Finance`);

  // Toast State
  const [successToast, setSuccessToast] = useState<ToastState | null>(null);

  // Filter State
  const [filters, setFilters] = useState<CollectionFiltersState>({});

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isRecordWholeWeekModalOpen, setIsRecordWholeWeekModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionModalMode, setCollectionModalMode] = useState<'view' | 'edit'>('view');

  // Queries — fetch Active groups so query key matches RecordPaymentModal & RecordWholeWeekModal perfectly
  const { data: groups = [] } = useGroups({ status: 'Active' });
  const {
    data: collections = [],
    isLoading: isLoadingCollections,
    refetch: refetchCollections,
    isFetching: isFetchingCollections,
  } = useCollections(filters);
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
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
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
            onClick={() => setIsRecordWholeWeekModalOpen(true)}
            leftIcon={<Zap className="h-4 w-4 text-emerald-300" />}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            aria-label="Record Whole Week Collection"
          >
            {language === 'ta' ? 'முழு வார வசூல்' : 'Record Whole Week'}
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
        weeklySummary={weeklySummary}
        isLoading={isLoadingWeekly}
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
        onViewDetails={(collection) => {
          setSelectedCollection(collection);
          setCollectionModalMode('view');
        }}
        onEdit={(collection) => {
          setSelectedCollection(collection);
          setCollectionModalMode('edit');
        }}
      />

      {/* ── Mobile Floating Action Button (FAB) for Record Payment ────── */}
      <button
        type="button"
        onClick={() => setIsRecordModalOpen(true)}
        className="fixed md:hidden z-30 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl hover:bg-primary-700 active:scale-95 transition-all"
        aria-label="Record Weekly Collection Payment"
      >
        <Plus className="h-4 w-4" />
        <span>{t('dashboard.recordPayment')}</span>
      </button>

      {/* ── Record Payment Modal ────────────────────────────────────────────── */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={({ week, memberName, amount }) => {
          setSuccessToast({
            message: language === 'ta' ? 'பணம் பதிவு செய்யப்பட்டது' : 'Payment Recorded',
            description: `${language === 'ta' ? 'வாரம்' : 'Week'} ${week} • ${memberName} • ${formatCurrency(amount)}`,
          });
        }}
      />

      {/* ── Record Whole Week Modal (One-click batch collection) ───────────────── */}
      <RecordWholeWeekModal
        isOpen={isRecordWholeWeekModalOpen}
        onClose={() => setIsRecordWholeWeekModalOpen(false)}
        onSuccess={(result) => {
          setSuccessToast({
            message: language === 'ta'
              ? `வாரம் ${result.business_week} வசூல்கள் பதிவு செய்யப்பட்டன!`
              : `Week ${result.business_week} Collections Recorded!`,
            description: language === 'ta'
              ? `${result.total_recorded} பதிவுகள் வெற்றிகரமாக சேர்க்கப்பட்டன (${formatCurrency(Number(result.total_amount))}).`
              : `${result.total_recorded} payments successfully recorded (${formatCurrency(Number(result.total_amount))}).`,
          });
          refetchCollections();
        }}
      />

      {/* ── Collection Details Modal ─────────────────────────────────────────── */}
      <CollectionDetailsModal
        collection={selectedCollection}
        isOpen={Boolean(selectedCollection)}
        initialMode={collectionModalMode}
        onClose={() => setSelectedCollection(null)}
        onSuccess={(msg) => {
          setSuccessToast({
            message: msg,
          });
          refetchCollections();
        }}
      />
    </PageContainer>
  );
}

export default CollectionsPage;
