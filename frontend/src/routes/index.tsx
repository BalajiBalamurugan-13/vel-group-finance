/**
 * VEL Finance — Route Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Central route definitions using React Router v6 Data Router API.
 *
 * Architecture decisions:
 * - createBrowserRouter (Data Router) — enables future loader/action patterns
 *   without refactoring when server-side data fetching is needed.
 * - All page routes are lazy-loaded for performance (per 10_DEVELOPMENT_RULES.md).
 * - Suspense fallback uses LoadingState for skeleton-ready loading UX.
 * - Root redirect: / → /dashboard.
 */
import { lazy, Suspense } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { AppLayout } from '@/layouts';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// ── Lazy Page Imports ─────────────────────────────────────────────────────────
// Each page is a separate JS chunk for optimal loading performance.

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const GroupsPage = lazy(() =>
  import('@/pages/GroupsPage').then((m) => ({ default: m.GroupsPage })),
);
const MembersPage = lazy(() =>
  import('@/pages/MembersPage').then((m) => ({ default: m.MembersPage })),
);
const CollectionsPage = lazy(() =>
  import('@/pages/CollectionsPage').then((m) => ({ default: m.CollectionsPage })),
);
const ReportsPage = lazy(() =>
  import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const SchemesPage = lazy(() =>
  import('@/pages/SchemesPage').then((m) => ({ default: m.SchemesPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

// ── Suspense Wrapper ──────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      {children}
    </Suspense>
  );
}

// ── Route Definitions ─────────────────────────────────────────────────────────

export const routes: RouteObject[] = [
  {
    // Root redirect: / → /dashboard
    path: ROUTES.ROOT,
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },
  {
    // App shell — contains the adaptive layout (desktop sidebar / mobile bottom nav)
    element: (
      <ErrorBoundary>
        <AppLayout />
      </ErrorBoundary>
    ),
    children: [
      {
        path: ROUTES.DASHBOARD,
        element: (
          <LazyPage>
            <DashboardPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.GROUPS,
        element: (
          <LazyPage>
            <GroupsPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.MEMBERS,
        element: (
          <LazyPage>
            <MembersPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.COLLECTIONS,
        element: (
          <LazyPage>
            <CollectionsPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.REPORTS,
        element: (
          <LazyPage>
            <ReportsPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.SETTINGS,
        element: (
          <LazyPage>
            <SettingsPage />
          </LazyPage>
        ),
      },
      {
        path: ROUTES.SCHEMES,
        element: (
          <LazyPage>
            <SchemesPage />
          </LazyPage>
        ),
      },
    ],
  },
  {
    // 404 — outside the app layout so it can be full-screen
    path: ROUTES.NOT_FOUND,
    element: (
      <LazyPage>
        <NotFoundPage />
      </LazyPage>
    ),
  },
];
