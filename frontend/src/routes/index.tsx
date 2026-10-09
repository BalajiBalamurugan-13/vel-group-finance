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
import { Navigate, type RouteObject } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { AppLayout } from '@/layouts';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// ── Eager Page Imports for Instant, Native-Speed Navigation ──────────────────
// Eagerly importing primary pages eliminates the jarring fullPage loading screen
// and ensures instantaneous 0ms tab switching matching the DL application.
import { DashboardPage } from '@/pages/DashboardPage';
import { GroupsPage } from '@/pages/GroupsPage';
import { MembersPage } from '@/pages/MembersPage';
import { CollectionsPage } from '@/pages/CollectionsPage';
import { ProfitPage } from '@/pages/ProfitPage';
import { LoanRiskPage } from '@/pages/LoanRiskPage';
import { PlacesPage } from '@/pages/PlacesPage';
import { CollectionSheetPage } from '@/pages/CollectionSheetPage';
import { SchemesPage } from '@/pages/SchemesPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

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
        element: <DashboardPage />,
      },
      {
        path: ROUTES.GROUPS,
        element: <GroupsPage />,
      },
      {
        path: ROUTES.MEMBERS,
        element: <MembersPage />,
      },
      {
        path: ROUTES.COLLECTIONS,
        element: <CollectionsPage />,
      },
      {
        path: ROUTES.PROFIT,
        element: <ProfitPage />,
      },
      {
        path: ROUTES.LOAN_RISK,
        element: <LoanRiskPage />,
      },
      {
        path: ROUTES.PLACES,
        element: <PlacesPage />,
      },
      {
        path: ROUTES.COLLECTION_SHEET,
        element: <CollectionSheetPage />,
      },
      {
        path: ROUTES.REPORTS,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },
      {
        path: ROUTES.SETTINGS,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },
      {
        path: ROUTES.SCHEMES,
        element: <SchemesPage />,
      },
    ],
  },
  {
    // 404 — outside the app layout so it can be full-screen
    path: ROUTES.NOT_FOUND,
    element: <NotFoundPage />,
  },
];
