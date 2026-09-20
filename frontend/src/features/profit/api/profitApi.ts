import { httpClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/common';
import type {
  Investment,
  InvestmentCreate,
  InvestmentSummary,
  ProfitSummary,
  WeeklyFinancialBreakdown,
} from '../types';

export const profitApi = {
  getSummary: async (): Promise<ProfitSummary> => {
    const { data } = await httpClient.get<ApiResponse<ProfitSummary>>('/profit/summary');
    return data.data;
  },

  getWeeklyBreakdown: async (maxWeeks?: number): Promise<WeeklyFinancialBreakdown[]> => {
    const params = maxWeeks ? { max_weeks: maxWeeks } : undefined;
    const { data } = await httpClient.get<ApiResponse<WeeklyFinancialBreakdown[]>>(
      '/profit/weekly',
      { params }
    );
    return data.data;
  },

  getInvestments: async (): Promise<Investment[]> => {
    const { data } = await httpClient.get<ApiResponse<Investment[]>>('/investments');
    return data.data;
  },

  getInvestmentSummary: async (): Promise<InvestmentSummary> => {
    const { data } = await httpClient.get<ApiResponse<InvestmentSummary>>('/investments/summary');
    return data.data;
  },

  createInvestment: async (payload: InvestmentCreate): Promise<Investment> => {
    const { data } = await httpClient.post<ApiResponse<Investment>>('/investments', payload);
    return data.data;
  },
};
