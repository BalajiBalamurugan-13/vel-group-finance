/**
 * VEL Finance — Dashboard API Client
 * =====================================
 * Calls GET /api/v1/dashboard and returns the typed DashboardSummary.
 * Per docs/07_API_SPECIFICATION.md — Module 7.
 */
import { httpClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/common';
import type { DashboardSummary } from '../types';

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await httpClient.get<ApiResponse<DashboardSummary>>('/dashboard');
    return data.data;
  },
};
