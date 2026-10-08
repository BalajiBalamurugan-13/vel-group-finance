/**
 * VEL Finance — Dashboard React Query Hook
 * ==========================================
 * Fetches the dashboard summary via GET /api/v1/dashboard.
 *
 * queryKey: ['dashboard']
 *
 * This key is already invalidated by useRecordCollection() in
 * frontend/src/features/collections/hooks/useCollections.ts:
 *   queryClient.invalidateQueries({ queryKey: ['dashboard'] })
 *
 * So the dashboard automatically refreshes after every successful
 * collection payment — no extra wiring required.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';

export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;
export const MIGRATION_STATUS_QUERY_KEY = ['dashboard', 'migration-status'] as const;

export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: dashboardApi.getSummary,
    // Refresh every 2 minutes in the background for live field use
    staleTime: 2 * 60 * 1000,
  });
}

export function useMigrationStatus() {
  return useQuery({
    queryKey: MIGRATION_STATUS_QUERY_KEY,
    queryFn: dashboardApi.getMigrationStatus,
    staleTime: 60 * 1000,
  });
}

export function useCompleteMigration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dashboardApi.completeMigration,
    onSuccess: () => {
      // Refresh dashboard summary and migration status immediately
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MIGRATION_STATUS_QUERY_KEY });
    },
  });
}
