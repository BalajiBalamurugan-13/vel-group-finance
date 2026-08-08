/**
 * VEL Finance — Navigation Types
 * ─────────────────────────────────────────────────────────────────────────────
 * Types for sidebar navigation items, breadcrumbs, and route metadata.
 */
import type { LucideIcon } from 'lucide-react';

// ── Navigation Item ───────────────────────────────────────────────────────────

export interface NavItem {
  /** Display label */
  label: string;
  /** Route path (from ROUTES constants) */
  path: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Whether this item is active — determined programmatically */
  isActive?: boolean;
  /** Badge count (e.g. pending notifications) — future-ready */
  badge?: number;
  /** Sub-navigation items — future-ready for nested menus */
  children?: NavItem[];
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  path?: string; // undefined = current page (not clickable)
}
