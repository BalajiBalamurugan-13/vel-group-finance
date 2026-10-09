import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schemeApi } from '../api/schemeApi';

export const SCHEMES_QUERY_KEY = ['schemes'];

export function useSchemes() {
  return useQuery({
    queryKey: SCHEMES_QUERY_KEY,
    queryFn: schemeApi.getSchemes,
    staleTime: 5 * 60_000, // 5 minutes — schemes are rarely modified
  });
}

export function useScheme(id: string) {
  return useQuery({
    queryKey: [...SCHEMES_QUERY_KEY, id],
    queryFn: () => schemeApi.getScheme(id),
    enabled: !!id,
  });
}

export function useCreateScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schemeApi.createScheme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEMES_QUERY_KEY });
    },
  });
}

export function useUpdateScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schemeApi.updateScheme,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SCHEMES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...SCHEMES_QUERY_KEY, variables.id] });
    },
  });
}

export function useUpdateSchemeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schemeApi.updateSchemeStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SCHEMES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...SCHEMES_QUERY_KEY, variables.id] });
    },
  });
}
