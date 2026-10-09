/**
 * VEL Finance — Expenses API Client
 * =================================
 */
import { httpClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/common';
import type { Expense, ExpenseCreatePayload, ExpenseSummary } from '../types';

export const expenseApi = {
  getExpenses: async (params?: { start_date?: string; end_date?: string; limit?: number }): Promise<Expense[]> => {
    const { data } = await httpClient.get<ApiResponse<Expense[]>>('/expenses', { params });
    return data.data;
  },

  getSummary: async (date?: string): Promise<ExpenseSummary> => {
    const { data } = await httpClient.get<ApiResponse<ExpenseSummary>>('/expenses/summary', {
      params: date ? { date } : undefined,
    });
    return data.data;
  },

  addExpense: async (payload: ExpenseCreatePayload): Promise<Expense> => {
    const { data } = await httpClient.post<ApiResponse<Expense>>('/expenses', payload);
    return data.data;
  },

  deleteExpense: async (id: string): Promise<{ id: string; deleted: boolean }> => {
    const { data } = await httpClient.delete<ApiResponse<{ id: string; deleted: boolean }>>(`/expenses/${id}`);
    return data.data;
  },

  updateExpense: async (id: string, payload: Partial<ExpenseCreatePayload>): Promise<Expense> => {
    const { data } = await httpClient.put<ApiResponse<Expense>>(`/expenses/${id}`, payload);
    return data.data;
  },
};
