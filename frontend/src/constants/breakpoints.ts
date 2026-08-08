/**
 * VEL Finance — Breakpoint Constants
 * ─────────────────────────────────────────────────────────────────────────────
 * Breakpoint values in pixels.
 * These correspond to Tailwind v4 default breakpoints.
 *
 * Usage: useBreakpoint hook, matchMedia calls, conditional logic.
 *
 * Per 12_AI_CONTEXT.md: Adaptive Responsive Design.
 * Desktop (≥1024px) → Sidebar layout.
 * Mobile (<1024px) → Bottom navigation layout.
 *
 * Supported widths per spec:
 * 320px, 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px, 1920px
 */

export const BREAKPOINTS = {
  /** 640px — sm: Small devices, large phones */
  SM: 640,
  /** 768px — md: Tablets */
  MD: 768,
  /** 1024px — lg: Desktops, laptops (layout switch threshold) */
  LG: 1024,
  /** 1280px — xl: Large desktops */
  XL: 1280,
  /** 1536px — 2xl: Wide screens */
  '2XL': 1536,
} as const;

/**
 * The breakpoint at which the layout switches from mobile (bottom nav)
 * to desktop (sidebar). Components use this value from the hook.
 */
export const DESKTOP_BREAKPOINT = BREAKPOINTS.LG;

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'mobile';
