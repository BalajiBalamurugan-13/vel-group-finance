/**
 * VEL Finance — API Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * API endpoint constants and versioning configuration.
 *
 * Note: This is infrastructure only. No actual API calls.
 * Feature-specific endpoints are defined in their service files
 * (e.g. src/features/groups/services/groupService.ts).
 */

/** API version prefix */
export const API_VERSION = 'v1';

/**
 * API endpoint namespace constants.
 * Used as path prefixes for feature service files.
 */
export const API_ENDPOINTS = {
  GROUPS: '/groups',
  MEMBERS: '/members',
  SCHEMES: '/schemes',
  COLLECTIONS: '/collections',
  REPORTS: '/reports',
  DASHBOARD: '/dashboard',
} as const;

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];
