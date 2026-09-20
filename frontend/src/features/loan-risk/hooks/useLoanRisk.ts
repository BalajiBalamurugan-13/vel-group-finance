import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loanRiskApi } from '../api/loanRiskApi';
import type { LoanRiskFiltersState } from '../types';

export const LOAN_RISK_QUERY_KEY = ['loan-risk'] as const;

export function useLoanRisk(filters?: LoanRiskFiltersState) {
  return useQuery({
    queryKey: [
      ...LOAN_RISK_QUERY_KEY,
      filters?.risk_status || 'All',
      filters?.group_id || 'all',
      filters?.search || '',
    ],
    queryFn: () => loanRiskApi.getAnalysis(filters),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
