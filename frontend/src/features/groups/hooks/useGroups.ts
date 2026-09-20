import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { groupApi } from '../api/groupApi';
import type { GroupFiltersState } from '../types';

export const GROUPS_QUERY_KEY = ['groups'];

export function useGroups(filters?: GroupFiltersState) {
  return useQuery({
    queryKey: [
      ...GROUPS_QUERY_KEY,
      filters?.status || 'All',
      filters?.location || '',
      filters?.search || '',
    ],
    queryFn: () =>
      groupApi.getGroups({
        status: filters?.status,
        location: filters?.location,
        search: filters?.search,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: [...GROUPS_QUERY_KEY, id],
    queryFn: () => groupApi.getGroup(id),
    enabled: Boolean(id),
  });
}

export function useSuggestGroupName(location: string, enabled = true) {
  return useQuery({
    queryKey: ['group-suggest-name', location.trim()],
    queryFn: () => groupApi.suggestGroupName(location),
    enabled: enabled && Boolean(location.trim()),
    staleTime: 5000,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: groupApi.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: groupApi.updateGroup,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...GROUPS_QUERY_KEY, variables.id],
      });
    },
  });
}

export function useUpdateGroupStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: groupApi.updateGroupStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...GROUPS_QUERY_KEY, variables.id],
      });
    },
  });
}
