/**
 * VEL Finance — Expenses React Query Hooks
 * ========================================
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '../api/expenseApi';
import type { ExpenseCreatePayload } from '../types';
import { DASHBOARD_QUERY_KEY } from '@/features/dashboard';

export const EXPENSES_QUERY_KEY = ['expenses'] as const;
export const EXPENSES_SUMMARY_QUERY_KEY = ['expenses', 'summary'] as const;

export function useExpenseSummary(date?: string) {
  return useQuery({
    queryKey: [...EXPENSES_SUMMARY_QUERY_KEY, date],
    queryFn: () => expenseApi.getSummary(date),
    staleTime: 60 * 1000,
  });
}

export function useExpenses(params?: { start_date?: string; end_date?: string; limit?: number }) {
  return useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, params],
    queryFn: () => expenseApi.getExpenses(params),
    staleTime: 60 * 1000,
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ExpenseCreatePayload) => expenseApi.addExpense(payload),
    onSuccess: () => {
      // Invalidate expenses and dashboard cache immediately
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EXPENSES_SUMMARY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expenseApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EXPENSES_SUMMARY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ExpenseCreatePayload> }) =>
      expenseApi.updateExpense(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EXPENSES_SUMMARY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}
