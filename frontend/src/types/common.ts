/**
 * VEL Finance — Common TypeScript Types
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared types used across the entire frontend.
 *
 * Rules (per 10_DEVELOPMENT_RULES.md):
 * - Strict TypeScript — no `any` types.
 * - Proper interfaces for all data shapes.
 * - Reusable types centralized here.
 */

// ── Base Entity ───────────────────────────────────────────────────────────────

/**
 * Base interface for all database-backed entities.
 * All entities use UUID identifiers (per 10_DEVELOPMENT_RULES.md).
 */
export interface BaseEntity {
  id: string;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

// ── API Response Types ────────────────────────────────────────────────────────

/**
 * Standard API success response envelope.
 * All API responses follow this shape (per 07_API_SPECIFICATION.md).
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

/**
 * Standard API error response shape.
 */
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, string[]>;
  statusCode: number;
  /** Present when code === 'INACTIVE_SCHEME_REACTIVATABLE' */
  schemeId?: string;
}

/**
 * Paginated API response envelope.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  success: boolean;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

// ── UI State ──────────────────────────────────────────────────────────────────

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  field: string;
  direction: SortDirection;
}

// ── Form ──────────────────────────────────────────────────────────────────────

export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

// ── Status Types ──────────────────────────────────────────────────────────────

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

// ── Component Helpers ─────────────────────────────────────────────────────────

/** Generic children prop */
export interface WithChildren {
  children: React.ReactNode;
}

/** Generic className prop */
export interface WithClassName {
  className?: string;
}

/** Combines children and className */
export type ComponentProps = WithChildren & WithClassName;
