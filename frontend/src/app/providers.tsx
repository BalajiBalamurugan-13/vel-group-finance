/**
 * VEL Finance — Application Providers
 * ─────────────────────────────────────────────────────────────────────────────
 * Composes all application-level providers in a single tree.
 *
 * Provider order (inside-out — outermost wraps everything):
 * 1. ErrorBoundary        — catches all unhandled render errors
 * 2. QueryClientProvider  — TanStack Query server state
 * 3. DevtoolsWrapper      — dev-only, desktop-only query inspection
 *
 * React Query Devtools rules:
 * - NEVER rendered in production (isDevelopment guard)
 * - NEVER rendered on mobile (would overlap bottom navigation)
 * - Only available on desktop during active development
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
import { useBreakpoint } from '@/hooks';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * DevtoolsWrapper — renders React Query Devtools only on desktop during dev.
 *
 * Must be a separate component so useBreakpoint() is called inside the
 * QueryClientProvider tree and AFTER the provider is mounted.
 *
 * On mobile this returns null, ensuring the bottom navigation is
 * never obstructed by the Devtools floating trigger button.
 */
function DevtoolsWrapper() {
  const { isDesktop } = useBreakpoint();

  // Only render on desktop — never obstruct mobile bottom navigation
  if (!isDesktop) return null;

  return (
    <ReactQueryDevtools
      initialIsOpen={false}
      buttonPosition="bottom-right"
    />
  );
}

export function Providers({ children }: ProvidersProps) {
  const { isDevelopment } = getEnvConfig();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* Dev-only, desktop-only — see DevtoolsWrapper comment above */}
        {isDevelopment && <DevtoolsWrapper />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
