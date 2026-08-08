/**
 * VEL Finance — Application Providers
 * ─────────────────────────────────────────────────────────────────────────────
 * Composes all application-level providers in a single tree.
 *
 * Provider order (inside-out — outermost wraps everything):
 * 1. ErrorBoundary     — catches all unhandled render errors
 * 2. QueryClientProvider — TanStack Query server state
 * 3. ReactQueryDevtools — dev-only query inspection
 *
 * Note: React Router is configured in src/routes/router.tsx and wraps
 * the page-level components. Providers here are data-layer only.
 */
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { getEnvConfig } from '@/config/env';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const { isDevelopment } = getEnvConfig();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        {isDevelopment && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
