/**
 * VEL Finance — Dashboard API Client
 * =====================================
 * Calls GET /api/v1/dashboard and returns the typed DashboardSummary.
 * Per docs/07_API_SPECIFICATION.md — Module 7.
 */
import { httpClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/common';
import type {
  DashboardSummary,
  MigrationStatusResponse,
  CompleteMigrationResponse,
} from '../types';

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await httpClient.get<ApiResponse<DashboardSummary>>('/dashboard');
    return data.data;
  },

  getMigrationStatus: async (): Promise<MigrationStatusResponse> => {
    const { data } = await httpClient.get<ApiResponse<MigrationStatusResponse>>('/dashboard/migration-status');
    return data.data;
  },

  completeMigration: async (): Promise<CompleteMigrationResponse> => {
    const { data } = await httpClient.post<ApiResponse<CompleteMigrationResponse>>('/dashboard/complete-migration');
    return data.data;
  },
};
