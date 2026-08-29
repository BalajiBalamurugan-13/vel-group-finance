/**
 * VEL Finance - Dashboard Feature Barrel
 * Centralised exports for the dashboard feature module.
 */

// Types
export type { DashboardSummary, GroupLocationSummary, RecentCollection } from './types';

// API
export { dashboardApi } from './api/dashboardApi';

// Hooks
export { useDashboard, DASHBOARD_QUERY_KEY } from './hooks/useDashboard';

// Components
export { StatCard } from './components/StatCard';
export { GroupLocationList } from './components/GroupLocationList';
export { RecentCollectionsTable } from './components/RecentCollectionsTable';
export { DashboardSkeleton } from './components/DashboardSkeleton';
