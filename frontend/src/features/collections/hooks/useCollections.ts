import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { collectionApi } from '../api/collectionApi';
import type { CollectionFiltersState } from '../types';

export const COLLECTIONS_QUERY_KEY = ['collections'];

export function useCollections(filters?: CollectionFiltersState) {
  return useQuery({
    queryKey: [
      ...COLLECTIONS_QUERY_KEY,
      filters?.group_id || 'All',
      filters?.member_id || 'All',
      filters?.collector_id || 'All',
      filters?.payment_date || 'All',
      filters?.from_date || '',
      filters?.to_date || '',
    ],
    queryFn: () =>
      collectionApi.getCollections({
        group_id: filters?.group_id,
        member_id: filters?.member_id,
        collector_id: filters?.collector_id,
        payment_date: filters?.payment_date,
        from_date: filters?.from_date,
        to_date: filters?.to_date,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: [...COLLECTIONS_QUERY_KEY, id],
    queryFn: () => collectionApi.getCollection(id),
    enabled: Boolean(id),
  });
}

export function useTodayCollections(targetDate?: string) {
  return useQuery({
    queryKey: [...COLLECTIONS_QUERY_KEY, 'today', targetDate || 'today'],
    queryFn: () => collectionApi.getTodayCollections(targetDate),
  });
}

export function useWeeklyCollectionSummary(groupId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...COLLECTIONS_QUERY_KEY, 'weekly', groupId || 'All'],
    queryFn: () => collectionApi.getWeeklySummary(groupId),
    enabled,
  });
}

export function useRecordCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: collectionApi.recordCollection,
    onSuccess: async (_, variables) => {
      // Optimistically update repayment progress in all members queries
      if (variables?.member_id) {
        queryClient.setQueriesData({ queryKey: ['members'] }, (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData)) {
            return oldData.map((m: any) => {
              if (m.id === variables.member_id) {
                return {
                  ...m,
                  weeks_paid: Math.max(m.weeks_paid || 0, variables.week_number),
                };
              }
              return m;
            });
          }
          if (typeof oldData === 'object' && oldData.id === variables.member_id) {
            return {
              ...oldData,
              weeks_paid: Math.max(oldData.weeks_paid || 0, variables.week_number),
            };
          }
          return oldData;
        });
      }

      // Invalidate active collections, members, groups, and dashboard for immediate visual feedback
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['members'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['groups'], refetchType: 'active' }),
      ]);
      queryClient.invalidateQueries({ queryKey: ['profit'], refetchType: 'none' });
    },
  });
}

export function useRecordBulkCollections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: collectionApi.recordBulkCollections,
    onSuccess: async (_, variables) => {
      // Optimistically update repayment progress in all members queries immediately
      if (variables && Array.isArray(variables)) {
        const itemMap = new Map(variables.map((it) => [it.member_id, it.week_number]));
        queryClient.setQueriesData({ queryKey: ['members'] }, (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData)) {
            return oldData.map((m: any) => {
              if (itemMap.has(m.id)) {
                const recordedWeek = itemMap.get(m.id)!;
                return {
                  ...m,
                  weeks_paid: Math.max(m.weeks_paid || 0, recordedWeek),
                };
              }
              return m;
            });
          }
          if (typeof oldData === 'object' && itemMap.has(oldData.id)) {
            const recordedWeek = itemMap.get(oldData.id)!;
            return {
              ...oldData,
              weeks_paid: Math.max(oldData.weeks_paid || 0, recordedWeek),
            };
          }
          return oldData;
        });
      }

      // Invalidate active collections, members, groups, and dashboard for complete server synchronization
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['members'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['groups'], refetchType: 'active' }),
      ]);
      queryClient.invalidateQueries({ queryKey: ['profit'], refetchType: 'none' });
    },
  });
}
