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
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';

export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;

export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: dashboardApi.getSummary,
    // Refresh every 2 minutes in the background for live field use
    staleTime: 2 * 60 * 1000,
  });
}
