import { useState } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { useDocumentTitle } from '@/hooks';
import { Button } from '@/components/ui/Button';
import {
  useProfitSummary,
  useWeeklyFinancials,
  useInvestmentSummary,
  InvestmentModal,
  InvestmentSummaryCards,
  BusinessGrowthCards,
  ContractualProfitCards,
  WeeklyFinancialTable,
} from '@/features/profit';
import { TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';

export function ProfitPage() {
  useDocumentTitle('Profit & Accounting');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const {
    data: profitSummary,
    isLoading: isLoadingProfit,
    isError: isProfitError,
    error: profitError,
    refetch: refetchProfit,
    isFetching: isFetchingProfit,
  } = useProfitSummary();

  const {
    data: weeklyFinancials,
    isLoading: isLoadingWeekly,
    refetch: refetchWeekly,
    isFetching: isFetchingWeekly,
  } = useWeeklyFinancials();

  const {
    data: investmentSummary,
    isLoading: isLoadingInvestments,
    refetch: refetchInvestments,
    isFetching: isFetchingInvestments,
  } = useInvestmentSummary();

  const isRefreshing = isFetchingProfit || isFetchingWeekly || isFetchingInvestments;
  const isLoading = isLoadingProfit || isLoadingInvestments;

  const handleRefreshAll = () => {
    refetchProfit();
    refetchWeekly();
    refetchInvestments();
  };

  if (isProfitError) {
    const message =
      (profitError as { message?: string })?.message ??
      'Unable to load profit summary. Please try again.';
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <AlertCircle className="h-12 w-12 text-error-500" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold text-secondary-900">
              Could not load profit analysis
            </p>
            <p className="mt-1 text-sm text-secondary-500">{message}</p>
          </div>
          <Button variant="secondary" onClick={handleRefreshAll}>
            Try Again
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-secondary-900">
              Accounting &amp; Profit Model
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            leftIcon={
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-secondary-500">
          Loading accounting model...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Owner Capital & Investments */}
          <InvestmentSummaryCards
            summary={investmentSummary}
            onOpenRecordModal={() => setIsRecordModalOpen(true)}
          />

          {/* Section 2: Loan Economics & Contractual Profit */}
          <ContractualProfitCards summary={profitSummary} />

          {/* Section 3: Business Growth & Group Funding Sources */}
          <BusinessGrowthCards summary={profitSummary} />

          {/* Section 4: Weekly Financial Breakdown (Sunday-to-Saturday) */}
          <WeeklyFinancialTable
            breakdown={weeklyFinancials}
            isLoading={isLoadingWeekly}
          />
        </div>
      )}

      {/* Record Investment Modal */}
      <InvestmentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={handleRefreshAll}
      />
    </PageContainer>
  );
}
