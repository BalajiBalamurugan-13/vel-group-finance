import { httpClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/common';
import type { LoanRiskFiltersState, LoanRiskSummary } from '../types';

export const loanRiskApi = {
  getAnalysis: async (filters?: LoanRiskFiltersState): Promise<LoanRiskSummary> => {
    const params: Record<string, string> = {};
    if (filters?.group_id && filters.group_id !== 'all') {
      params.group_id = filters.group_id;
    }
    if (filters?.risk_status && filters.risk_status !== 'All') {
      params.risk_status = filters.risk_status;
    }
    if (filters?.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }

    const { data } = await httpClient.get<ApiResponse<LoanRiskSummary>>('/loan-risk', {
      params,
    });
    return data.data;
  },
};
