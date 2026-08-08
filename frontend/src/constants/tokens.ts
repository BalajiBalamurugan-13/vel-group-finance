/**
 * VEL Finance — Design Tokens (TypeScript Mirror)
 * ─────────────────────────────────────────────────────────────────────────────
 * TypeScript constants that mirror CSS custom properties from tokens.css.
 *
 * Use these when you need design token values in:
 * - Framer Motion (animation durations, colors)
 * - Programmatic calculations
 * - Test utilities
 *
 * Always keep this file synchronized with tokens.css.
 */

export const COLORS = {
  // Brand Primary — Emerald
  primary: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },

  // Secondary — Slate
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Semantic
  success: { 50: '#f0fdf4', 100: '#dcfce7', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
  warning: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
  error: { 50: '#fef2f2', 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
  info: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },

  // Surface
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  borderSubtle: '#f1f5f9',

  // Text
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#94a3b8',
    disabled: '#cbd5e1',
    inverse: '#ffffff',
    brand: '#059669',
  },

  // Financial
  financial: {
    positive: '#16a34a',
    outstanding: '#d97706',
    overdue: '#dc2626',
    neutral: '#475569',
  },
} as const;

export const FONT = {
  family: {
    sans: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    mono: "ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace",
  },
  size: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const SPACING = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

export const SHADOW = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.07)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.07), 0 8px 10px -6px rgb(0 0 0 / 0.07)',
} as const;

export const Z_INDEX = {
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const;

/**
 * Animation durations — used with Framer Motion.
 * Values in seconds (Framer Motion convention).
 * Per 09_DESIGN_SYSTEM.md: 150ms–250ms.
 */
export const DURATION = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.25,
} as const;

export const EASING = {
  default: [0.4, 0, 0.2, 1] as [number, number, number, number],
  in: [0.4, 0, 1, 1] as [number, number, number, number],
  out: [0, 0, 0.2, 1] as [number, number, number, number],
  spring: { type: 'spring', stiffness: 400, damping: 30 },
} as const;

export const LAYOUT = {
  sidebarWidth: 256,
  sidebarCollapsedWidth: 72,
  headerHeight: 64,
  mobileHeaderHeight: 56,
  bottomNavHeight: 64,
  contentMaxWidth: 1440,
} as const;
