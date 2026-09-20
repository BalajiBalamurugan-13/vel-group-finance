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

export function useWeeklyCollectionSummary(groupId?: string) {
  return useQuery({
    queryKey: [...COLLECTIONS_QUERY_KEY, 'weekly', groupId || 'All'],
    queryFn: () => collectionApi.getWeeklySummary(groupId),
  });
}

export function useRecordCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: collectionApi.recordCollection,
    onSuccess: () => {
      // Invalidate collections, members, groups, and dashboard for updated metrics
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
