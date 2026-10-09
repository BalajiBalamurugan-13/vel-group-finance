/**
 * VEL Finance — Executive Business Dashboard
 * ============================================
 * Fast, reliable overview of core financial operations:
 * - Available Cash (Double-entry cashbook: Collections + Owner Cash - Disbursements - Expenses)
 * - Click Available Cash to view complete Cash Flow Drawer (same as Vel Finance DL)
 * - Today's Collection & Payment Count
 * - Active Groups & Member Counts
 * - Business Expenses Tracking & Deduction
 * - Route Breakdown by Location
 */
import { useState } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { useDocumentTitle } from '@/hooks';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { TOAST_DURATION_MS } from '@/constants/app';
import { formatCurrency } from '@/utils/format';
import {
  useDashboard,
  DashboardSkeleton,
  StatCard,
  GroupLocationList,
  CashDrawer,
} from '@/features/dashboard';
import { RecordPaymentModal } from '@/features/collections';
import { ExpenseDrawer, AddExpenseModal } from '@/features/expenses';
import { useLanguage } from '@/i18n';
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Receipt,
} from 'lucide-react';

interface ToastState {
  message: string;
  description?: string;
}

export function DashboardPage() {
  const { t } = useLanguage();
  useDocumentTitle(`${t('dashboard.title')} | VEL Finance`);

  // Toast State
  const [successToast, setSuccessToast] = useState<ToastState | null>(null);

  // Modal & Drawer States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);

  // Single consolidated query — loads in milliseconds with zero redundant fetches
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
    isFetching: isFetchingDashboard,
  } = useDashboard();

  // Operational KPI calculations from server-provided Decimal fields
  const todayTotal = Number(dashboardData?.todays_collection ?? 0);
  const todayCount = dashboardData?.todays_collection_count ?? 0;
  const totalExpenses = Number(dashboardData?.total_expenses ?? 0);

  // ── Error State ────────────────────────────────────────────────────────────
  if (isDashboardError && !dashboardData) {
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
          <Button variant="outline" onClick={() => refetchDashboard()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  // ── Loading Skeleton ────────────────────────────────────────────────────────
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

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchDashboard()}
            disabled={isFetchingDashboard}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetchingDashboard ? 'animate-spin text-primary-500' : 'text-secondary-500'}`}
              aria-hidden="true"
            />
            <span className="ml-1.5 text-secondary-600 text-xs sm:text-sm font-medium">
              {t('common.refresh')}
            </span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddExpenseModalOpen(true)}
            leftIcon={<Receipt className="h-4 w-4 text-error-600" />}
            aria-label="Record Business Expense"
          >
            {t('expenses.addExpense') || 'Record Expense'}
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

      <div className="space-y-6">
        {/* ── Section 1: Core Operational Pulse (4 Stat Cards) ───────────────── */}
        <section aria-label="Key operational metrics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Available Cash (Clickable -> Opens CashDrawer) */}
            <StatCard
              id="stat-available-cash"
              label={t('dashboard.availableCash')}
              value={dashboardData?.available_cash ?? 0}
              sublabel={t('dashboard.viewCashLedger') || 'Click to view cash ledger'}
              icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
              variant="primary"
              isCurrency
              onClick={() => setIsCashDrawerOpen(true)}
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

            {/* 3. Active Groups & Members Overview */}
            <StatCard
              id="stat-active-overview"
              label={t('dashboard.activeGroups')}
              value={`${dashboardData?.active_groups ?? 0} ${t('dashboard.groups')}`}
              sublabel={`${dashboardData?.active_members ?? 0} ${t('dashboard.activeMembers')} (${dashboardData?.total_members ?? 0} ${t('dashboard.totalMembers')})`}
              icon={<Layers className="h-5 w-5" aria-hidden="true" />}
              variant="info"
            />

            {/* 4. Business Expenses (Clickable -> Opens ExpenseDrawer) */}
            <StatCard
              id="stat-expenses"
              label={t('dashboard.expenses') || 'Expenses'}
              value={totalExpenses}
              sublabel={t('dashboard.viewExpenses') || 'Click to view & add expenses'}
              icon={<Receipt className="h-5 w-5" aria-hidden="true" />}
              variant="danger"
              isCurrency
              onClick={() => setIsExpenseDrawerOpen(true)}
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

      {/* ── Available Cash Slide-over Ledger (DL CashDrawer) ────────────────── */}
      <CashDrawer
        open={isCashDrawerOpen}
        onClose={() => setIsCashDrawerOpen(false)}
        summary={dashboardData}
        onOpenExpenses={() => {
          setIsCashDrawerOpen(false);
          setIsExpenseDrawerOpen(true);
        }}
        onAddExpense={() => {
          setIsAddExpenseModalOpen(true);
        }}
      />

      {/* ── Business Expenses Drawer ────────────────────────────────────────── */}
      <ExpenseDrawer
        open={isExpenseDrawerOpen}
        onClose={() => setIsExpenseDrawerOpen(false)}
        onExpenseAdded={(amt, note) => {
          setSuccessToast({
            message: t('expenses.addExpense') || 'Expense Recorded',
            description: `${note} • -${formatCurrency(amt)}`,
          });
          refetchDashboard();
        }}
      />

      {/* ── Add Expense Modal ──────────────────────────────────────────────── */}
      {isAddExpenseModalOpen && (
        <AddExpenseModal
          isOpen={isAddExpenseModalOpen}
          onClose={() => setIsAddExpenseModalOpen(false)}
          onSuccess={(amt, note) => {
            setSuccessToast({
              message: t('expenses.addExpense') || 'Expense Recorded',
              description: `${note} • -${formatCurrency(amt)}`,
            });
            refetchDashboard();
          }}
        />
      )}

      {/* ── Record Payment Modal ────────────────────────────────────────────── */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={({ week, memberName, amount }) => {
          setSuccessToast({
            message: t('dashboard.paymentRecordedToast') || 'Payment Recorded',
            description: `Week ${week} • ${memberName} • ${formatCurrency(amount)}`,
          });
          refetchDashboard();
        }}
      />
    </PageContainer>
  );
}

export default DashboardPage;
