/**
 * VEL Finance - Unified Dashboard & Collections Hub
 * ==================================================
 * Combines business overview metrics (available cash, active groups, locations)
 * with real-time field collection tracking and payment recording in one single place.
 *
 * Redundant metrics (total outstanding, loan principal, disbursements) have been
 * consolidated into the dedicated Profit & Accounting section to eliminate clutter.
 */
import { useState } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { useDocumentTitle } from '@/hooks';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { TOAST_DURATION_MS } from '@/constants/app';
import { formatCurrency } from '@/utils/format';
import {
  useDashboard,
  DashboardSkeleton,
  StatCard,
  GroupLocationList,
} from '@/features/dashboard';
import {
  CollectionList,
  CollectionFilters,
  RecordPaymentModal,
  CollectionDetailsModal,
  useCollections,
  useTodayCollections,
  useWeeklyCollectionSummary,
  type Collection,
  type CollectionFiltersState,
} from '@/features/collections';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useLanguage } from '@/i18n';
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface ToastState {
  message: string;
  description?: string;
}

export function DashboardPage() {
  const { t } = useLanguage();
  useDocumentTitle('Dashboard | VEL Finance');

  // Toast State
  const [successToast, setSuccessToast] = useState<ToastState | null>(null);

  // Filter State
  const [filters, setFilters] = useState<CollectionFiltersState>({});

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

  // Queries
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
    isFetching: isFetchingDashboard,
  } = useDashboard();

  const { data: groups = [] } = useGroups();

  const {
    data: collections = [],
    isLoading: isLoadingCollections,
    refetch: refetchCollections,
    isFetching: isFetchingCollections,
  } = useCollections(filters);

  const {
    data: todaySummary,
    refetch: refetchToday,
    isFetching: isFetchingToday,
  } = useTodayCollections();

  const {
    data: weeklySummary,
    isLoading: isLoadingWeekly,
    refetch: refetchWeekly,
    isFetching: isFetchingWeekly,
  } = useWeeklyCollectionSummary(filters.group_id);

  const isRefreshing =
    isFetchingDashboard ||
    isFetchingCollections ||
    isFetchingToday ||
    isFetchingWeekly;

  const handleRefreshAll = () => {
    refetchDashboard();
    refetchCollections();
    refetchToday();
    refetchWeekly();
  };

  // Filter collections by client-side search query (member name, group name, phone)
  const filteredCollections = collections.filter((c) => {
    if (!filters.search) return true;
    const term = filters.search.toLowerCase();
    const memberMatch = c.member_name?.toLowerCase().includes(term);
    const groupMatch = c.group_name?.toLowerCase().includes(term);
    const phoneMatch = c.phone_number?.includes(term);
    return memberMatch || groupMatch || phoneMatch;
  });

  // KPI Calculations
  const todayTotal = Number(
    todaySummary?.total_collected ?? dashboardData?.todays_collection ?? 0,
  );
  const todayCount = todaySummary?.collection_count ?? 0;

  const weeklyExpected = Number(weeklySummary?.total_expected ?? 0);
  const weeklyCollected = Number(weeklySummary?.total_collected ?? 0);
  const weeklyPending = Number(weeklySummary?.total_pending ?? 0);

  const overallProgress =
    weeklyExpected > 0
      ? Math.min(100, Math.round((weeklyCollected / weeklyExpected) * 100))
      : 0;

  // ── Error state ────────────────────────────────────────────────────────────
  if (isDashboardError) {
    const message =
      (dashboardError as { message?: string })?.message ??
      'Unable to load dashboard. Please try again.';
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <AlertCircle className="h-12 w-12 text-error-500" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold text-secondary-900">
              Could not load dashboard
            </p>
            <p className="mt-1 text-sm text-secondary-500">{message}</p>
          </div>
          <Button variant="outline" onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoadingDashboard && !dashboardData) {
    return (
      <PageContainer>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-secondary-900">{t('dashboard.title')}</h1>
        </div>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

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
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-secondary-900">{t('dashboard.title')}</h1>
          <p className="text-xs text-secondary-500 mt-0.5">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary-500' : 'text-secondary-500'}`}
              aria-hidden="true"
            />
            <span className="ml-1.5 text-secondary-600 text-xs sm:text-sm font-medium">
              {t('common.refresh')}
            </span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsRecordModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            aria-label="Record Weekly Collection Payment"
          >
            {t('dashboard.recordPayment')}
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {/* ── Section 1: Key Operational Metrics ─────────────────────────────── */}
        <section aria-label="Key operational metrics">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* 1. Available Cash (from Dashboard) */}
            <StatCard
              id="stat-available-cash"
              label={t('dashboard.availableCash')}
              value={dashboardData?.available_cash ?? 0}
              sublabel={t('dashboard.availableCashSub')}
              icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
              variant="primary"
              isCurrency
              className="col-span-2 sm:col-span-1"
            />

            {/* 2. Today's Collection */}
            <StatCard
              id="stat-todays-collection"
              label={t('dashboard.todaysCollection')}
              value={todayTotal}
              sublabel={`${todayCount} ${todayCount === 1 ? t('dashboard.paymentToday') : t('dashboard.paymentsToday')}`}
              icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
              variant="success"
              isCurrency
            />

            {/* 3. Weekly Collection Progress */}
            <Card className="p-3.5 sm:p-4 flex flex-col justify-between border border-border border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-secondary-500 uppercase tracking-wide">
                  {t('dashboard.weeklyExpected')}
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-bold font-mono text-secondary-900">
                  {isLoadingWeekly ? '—' : formatCurrency(weeklyExpected)}
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-secondary-500">
                    <span>{t('dashboard.collected')}: {formatCurrency(weeklyCollected)}</span>
                    <span className="font-semibold text-emerald-700">{overallProgress}%</span>
                  </div>
                  <div className="w-full bg-secondary-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* 4. Pending Collection */}
            <StatCard
              id="stat-pending-collection"
              label={t('dashboard.pendingThisWeek')}
              value={weeklyPending}
              sublabel={t('dashboard.pendingAcrossCycles')}
              icon={<AlertCircle className="h-5 w-5" aria-hidden="true" />}
              variant="warning"
              isCurrency
            />

            {/* 5. Active Groups & Members Overview */}
            <StatCard
              id="stat-active-overview"
              label={t('dashboard.activeGroups')}
              value={`${dashboardData?.active_groups ?? 0} ${t('dashboard.groups')}`}
              sublabel={`${dashboardData?.active_members ?? 0} ${t('dashboard.activeMembers')} (${dashboardData?.total_members ?? 0} ${t('dashboard.totalMembers')})`}
              icon={<Layers className="h-5 w-5" aria-hidden="true" />}
              variant="info"
              className="col-span-2 sm:col-span-1"
            />
          </div>
        </section>

        {/* ── Section 2: Active Groups by Location ───────────────────────────── */}
        {dashboardData?.groups_by_location && dashboardData.groups_by_location.length > 0 && (
          <section aria-label="Active groups by location">
            <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary-500" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-secondary-900">
                    {t('dashboard.locationsTitle')}
                  </h2>
                </div>
                <span className="text-xs text-secondary-500 font-medium">
                  {dashboardData.groups_by_location.length} {t('dashboard.locations')}
                </span>
              </div>
              <GroupLocationList locations={dashboardData.groups_by_location} />
            </div>
          </section>
        )}

        {/* ── Section 3: Collections (Search, Filters & Interactive Table) ───── */}
        <section aria-label="Collections list" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div>
              <h2 className="text-base font-bold text-secondary-900">
                {t('dashboard.collectionsTitle')}
              </h2>
              <p className="text-xs text-secondary-500">
                {t('dashboard.collectionsSubtitle')}
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <CollectionFilters
            filters={filters}
            groups={groups}
            onFilterChange={setFilters}
          />

          {/* Collections List (Table / Mobile Cards) */}
          <CollectionList
            collections={filteredCollections}
            isLoading={isLoadingCollections}
            onRecordPayment={() => setIsRecordModalOpen(true)}
            onViewDetails={(collection) => setSelectedCollection(collection)}
          />
        </section>
      </div>

      {/* ── Mobile Floating Action Button (FAB) for Record Payment ───────────── */}
      <button
        type="button"
        onClick={() => setIsRecordModalOpen(true)}
        className="fixed md:hidden z-30 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl hover:bg-primary-700 active:scale-95 transition-all"
        aria-label={t('dashboard.recordPayment')}
      >
        <Plus className="h-4 w-4" />
        <span>{t('dashboard.recordPayment')}</span>
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
          handleRefreshAll();
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

export default DashboardPage;

