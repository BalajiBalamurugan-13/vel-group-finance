/**
 * VEL Finance - Dashboard Page
 * ==============================
 * Business overview: financial metrics, group/member counts,
 * active groups by location, and recent paid collections.
 *
 * ALL financial values are backend-authoritative (GET /api/v1/dashboard).
 * No financial arithmetic is performed here - values are displayed only.
 *
 * Per docs/08_UI_UX_GUIDELINES.md - Dashboard Strategy:
 *   "Dashboard should answer immediately:
 *    How much money was collected today?
 *    How many collections are pending?
 *    Which groups need attention?
 *    How much outstanding exists?
 *    How much cash is available?"
 */
import { PageContainer } from '@/components/common/PageContainer';
import { useDocumentTitle } from '@/hooks';
import {
  useDashboard,
  DashboardSkeleton,
  StatCard,
  GroupLocationList,
  RecentCollectionsTable,
} from '@/features/dashboard';
import {
  Wallet,
  TrendingUp,
  ArrowUpFromLine,
  AlertCircle,
  Layers,
  Users,
  LayoutDashboard,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function DashboardPage() {
  useDocumentTitle('Dashboard');

  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard();

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    const message =
      (error as { message?: string })?.message ??
      'Unable to load dashboard. Please try again.';
    return (
      <PageContainer>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-secondary-900">Dashboard</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <AlertCircle className="h-12 w-12 text-error-500" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold text-secondary-900">
              Could not load dashboard
            </p>
            <p className="mt-1 text-sm text-secondary-500">{message}</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </PageContainer>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageContainer>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-secondary-900">Dashboard</h1>
        </div>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  // ── Dashboard content ───────────────────────────────────────────────────────
  if (!data) return null;

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-secondary-900">Dashboard</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh dashboard"
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? 'animate-spin text-primary-500' : 'text-secondary-500'}`}
            aria-hidden="true"
          />
          <span className="ml-1.5 hidden sm:inline text-secondary-600 text-sm">Refresh</span>
        </Button>
      </div>

      <div className="space-y-4">
        {/* ── Primary KPI Cards ──────────────────────────────────────────────── */}
        <section aria-label="Financial summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <StatCard
              id="stat-available-cash"
              label="Available Cash"
              value={data.available_cash}
              sublabel="Collections minus Disbursements"
              icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
              variant="primary"
              isCurrency
            />
            <StatCard
              id="stat-todays-collection"
              label="Today's Collection"
              value={data.todays_collection}
              sublabel="Paid today"
              icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
              variant="success"
              isCurrency
            />
            <StatCard
              id="stat-total-outstanding"
              label="Total Outstanding"
              value={data.total_outstanding}
              sublabel="Remaining across active cycles"
              icon={<AlertCircle className="h-5 w-5" aria-hidden="true" />}
              variant="danger"
              isCurrency
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <StatCard
              id="stat-total-loan-amount"
              label="Total Loan Amount"
              value={data.total_loan_amount}
              sublabel="Gross principal issued to members"
              icon={<ArrowUpFromLine className="h-5 w-5" aria-hidden="true" />}
              variant="warning"
              isCurrency
            />
            <StatCard
              id="stat-total-disbursement"
              label="Cash Disbursed"
              value={data.total_disbursement}
              sublabel={`Note cost deducted: ₹${data.total_note_cost}`}
              icon={<ArrowUpFromLine className="h-5 w-5" aria-hidden="true" />}
              variant="neutral"
              isCurrency
            />
          </div>
        </section>

        {/* ── Secondary Count Cards ──────────────────────────────────────────── */}
        <section aria-label="Group and member counts">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              id="stat-active-groups"
              label="Active Groups"
              value={data.active_groups}
              sublabel={`of ${data.total_groups} total`}
              icon={<Layers className="h-4 w-4" aria-hidden="true" />}
              variant="info"
            />
            <StatCard
              id="stat-active-members"
              label="Active Members"
              value={data.active_members}
              sublabel={`of ${data.total_members} total`}
              icon={<Users className="h-4 w-4" aria-hidden="true" />}
              variant="info"
            />
            <StatCard
              id="stat-total-groups"
              label="Total Groups"
              value={data.total_groups}
              icon={<Layers className="h-4 w-4" aria-hidden="true" />}
              variant="neutral"
            />
            <StatCard
              id="stat-total-members"
              label="Total Members"
              value={data.total_members}
              icon={<Users className="h-4 w-4" aria-hidden="true" />}
              variant="neutral"
            />
          </div>
        </section>

        {/* ── Location + Recent Collections ──────────────────────────────────── */}
        <section aria-label="Location summary and recent activity">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active groups by location */}
            <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-primary-500" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-secondary-900">
                  Active Groups by Location
                </h2>
              </div>
              <GroupLocationList locations={data.groups_by_location} />
            </div>

            {/* Recent paid collections */}
            <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success-600" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-secondary-900">
                  Recent Collections
                </h2>
              </div>
              <RecentCollectionsTable collections={data.recent_collections} />
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
