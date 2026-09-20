import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profitApi } from '../api/profitApi';
import type { InvestmentCreate } from '../types';

export const PROFIT_QUERY_KEY = ['profit', 'summary'] as const;
export const PROFIT_WEEKLY_QUERY_KEY = ['profit', 'weekly'] as const;
export const INVESTMENTS_QUERY_KEY = ['investments'] as const;
export const INVESTMENTS_SUMMARY_QUERY_KEY = ['investments', 'summary'] as const;

export function useProfitSummary() {
  return useQuery({
    queryKey: PROFIT_QUERY_KEY,
    queryFn: profitApi.getSummary,
    staleTime: 60 * 1000,
  });
}

export function useWeeklyFinancials(maxWeeks?: number) {
  return useQuery({
    queryKey: [...PROFIT_WEEKLY_QUERY_KEY, maxWeeks],
    queryFn: () => profitApi.getWeeklyBreakdown(maxWeeks),
    staleTime: 60 * 1000,
  });
}

export function useInvestments() {
  return useQuery({
    queryKey: INVESTMENTS_QUERY_KEY,
    queryFn: profitApi.getInvestments,
    staleTime: 60 * 1000,
  });
}

export function useInvestmentSummary() {
  return useQuery({
    queryKey: INVESTMENTS_SUMMARY_QUERY_KEY,
    queryFn: profitApi.getInvestmentSummary,
    staleTime: 60 * 1000,
  });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InvestmentCreate) => profitApi.createInvestment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: INVESTMENTS_SUMMARY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFIT_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFIT_WEEKLY_QUERY_KEY });
    },
  });
}
