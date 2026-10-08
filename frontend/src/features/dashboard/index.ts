/**
 * VEL Finance - Dashboard Feature Barrel
 * Centralised exports for the dashboard feature module.
 */

// Types
export type {
  DashboardSummary,
  GroupLocationSummary,
  RecentCollection,
  MigrationStatusResponse,
  CompleteMigrationResponse,
} from './types';

// API
export { dashboardApi } from './api/dashboardApi';

// Hooks
export {
  useDashboard,
  useMigrationStatus,
  useCompleteMigration,
  DASHBOARD_QUERY_KEY,
  MIGRATION_STATUS_QUERY_KEY,
} from './hooks/useDashboard';

// Components
export { StatCard } from './components/StatCard';
export { GroupLocationList } from './components/GroupLocationList';
export { RecentCollectionsTable } from './components/RecentCollectionsTable';
export { DashboardSkeleton } from './components/DashboardSkeleton';
export { MigrationBanner } from './components/MigrationBanner';
