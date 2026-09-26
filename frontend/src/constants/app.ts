/**
 * VEL Finance — Application Constants
 * ─────────────────────────────────────────────────────────────────────────────
 * Application-level constants that are static and environment-independent.
 *
 * Note: Environment-specific values (API URL, etc.) live in src/config/env.ts.
 */

export const APP = {
  NAME: 'VEL Finance',
  PRODUCT_NAME: 'VEL Finance - Group Finance',
  VERSION: '1.0.0',
  DESCRIPTION: 'Enterprise-grade group financial management platform',
} as const;

/** Default pagination page size for tables and lists */
export const DEFAULT_PAGE_SIZE = 25;

/** Available page size options for table pagination controls */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/** Query stale time in milliseconds (15 seconds for responsive background revalidation) */
export const QUERY_STALE_TIME = 15 * 1000;

/** Query cache time in milliseconds (10 minutes) */
export const QUERY_GC_TIME = 10 * 60 * 1000;

/** Debounce delay for search inputs in milliseconds */
export const SEARCH_DEBOUNCE_MS = 300;

/** Toast notification auto-dismiss duration in milliseconds (0.4 seconds) */
export const TOAST_DURATION_MS = 400;

/** Maximum length for text inputs (general) */
export const MAX_TEXT_LENGTH = 255;
