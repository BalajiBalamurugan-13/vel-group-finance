/**
 * VEL Finance — Route Constants
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized route path definitions.
 *
 * Rules:
 * - Never hardcode route strings in components.
 * - Always import from this file.
 * - Keeps routing refactors to a single change point.
 */

export const ROUTES = {
  /** Root — redirects to DASHBOARD */
  ROOT: '/',

  // ── Primary Navigation ───────────────────────────────────────────────────
  DASHBOARD: '/dashboard',
  GROUPS: '/groups',
  MEMBERS: '/members',
  COLLECTIONS: '/collections',
  PROFIT: '/profit',
  LOAN_RISK: '/loan-risk',
  PLACES: '/places',
  COLLECTION_SHEET: '/collection-sheet',
  REPORTS: '/reports',
  SCHEMES: '/schemes',
  SETTINGS: '/settings',

  // ── 404 ──────────────────────────────────────────────────────────────────
  NOT_FOUND: '*',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
