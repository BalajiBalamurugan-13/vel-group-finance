import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { memberApi } from '../api/memberApi';
import type { MemberFiltersState } from '../types';

export const MEMBERS_QUERY_KEY = ['members'];

export function useMembers(
  filters?: MemberFiltersState,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [
      ...MEMBERS_QUERY_KEY,
      filters?.status || 'All',
      filters?.group_id || 'All',
      filters?.search || '',
    ],
    queryFn: () =>
      memberApi.getMembers({
        status: filters?.status,
        group_id: filters?.group_id,
        search: filters?.search,
      }),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: [...MEMBERS_QUERY_KEY, id],
    queryFn: () => memberApi.getMember(id),
    enabled: Boolean(id),
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: memberApi.createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: memberApi.updateMember,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...MEMBERS_QUERY_KEY, variables.id],
      });
    },
  });
}

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: memberApi.updateMemberStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...MEMBERS_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
