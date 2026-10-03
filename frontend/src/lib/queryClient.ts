/**
 * VEL Finance — TanStack Query Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Configured QueryClient with production-appropriate defaults.
 *
 * Defaults are intentionally conservative for a financial application:
 * - staleTime: Data is fresh for 5 minutes (prevents excessive refetches).
 * - gcTime: Unused cache removed after 10 minutes.
 * - retry: 1 retry on failure (avoids hammering a failing backend).
 * - refetchOnWindowFocus: true — ensures data is fresh when user returns.
 */
import { keepPreviousData, QueryClient } from '@tanstack/react-query';
import { QUERY_GC_TIME } from '@/constants';
import type { ApiError } from '@/types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      placeholderData: keepPreviousData,
      staleTime: 30_000, // 30 seconds: prevents redundant refetches during quick navigation
      gcTime: QUERY_GC_TIME,
      retry: (failureCount, error) => {
        const apiError = error as unknown as ApiError;
        // Never retry on client errors (4xx) — only on server errors (5xx)
        if (apiError.statusCode >= 400 && apiError.statusCode < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Prevents sudden API bursts when alt-tabbing
      refetchOnReconnect: true,
      refetchOnMount: true, // Only revalidates on mount if older than staleTime
    },
    mutations: {
      retry: false, // Never retry mutations automatically
      onError: (error) => {
        // Global mutation error handler — individual queries can override
        const apiError = error as unknown as ApiError;
        console.error('[VEL Finance] Mutation failed:', apiError.message);
      },
    },
  },
});
