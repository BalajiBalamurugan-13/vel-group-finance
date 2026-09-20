import { useState } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { useDocumentTitle } from '@/hooks';
import { Button } from '@/components/ui/Button';
import { useGroups } from '@/features/groups/hooks/useGroups';
import {
  useLoanRisk,
  LoanRiskSummaryCards,
  LoanRiskFilters,
  LoanRiskTable,
  type LoanRiskFiltersState,
} from '@/features/loan-risk';
import { AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';

export function LoanRiskPage() {
  useDocumentTitle('Loan Risk & Overdue');

  const [filters, setFilters] = useState<LoanRiskFiltersState>({
    risk_status: 'All',
    group_id: 'all',
    search: '',
  });

  const { data: groups = [] } = useGroups();
  const { data: analysis, isLoading, isError, error, refetch, isFetching } = useLoanRisk(filters);

  if (isError) {
    const message =
      (error as { message?: string })?.message ??
      'Unable to load loan risk analysis. Please try again.';
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <AlertCircle className="h-12 w-12 text-error-500" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold text-secondary-900">
              Could not load loan risk data
            </p>
            <p className="mt-1 text-sm text-secondary-500">{message}</p>
          </div>
          <Button variant="secondary" onClick={() => refetch()}>
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
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <h1 className="text-xl font-bold text-secondary-900">
              Loan Risk &amp; Overdue Tracking
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            leftIcon={
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
              />
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* KPI Cards: Current, Overdue, At Risk, Total Overdue */}
        <LoanRiskSummaryCards summary={analysis} />

        {/* Filters: Category Tabs, Search, Group Dropdown */}
        <LoanRiskFilters
          filters={filters}
          onFilterChange={setFilters}
          groups={groups.map((g) => ({ id: g.id, group_name: g.group_name }))}
        />

        {/* Loan Risk & Overdue Members Table */}
        <LoanRiskTable members={analysis?.members} isLoading={isLoading} />
      </div>
    </PageContainer>
  );
}
