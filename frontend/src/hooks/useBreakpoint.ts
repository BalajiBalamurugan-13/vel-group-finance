/**
 * VEL Finance — useBreakpoint Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects the current viewport breakpoint using matchMedia.
 *
 * Per 12_AI_CONTEXT.md / 08_UI_UX_GUIDELINES.md:
 * This application uses Adaptive Responsive Design — not just CSS responsiveness.
 * The AppLayout uses this hook to render structurally different layouts:
 * - Desktop (≥1024px): Sidebar + Header + Content
 * - Mobile (<1024px): Mobile Header + Content + Bottom Navigation
 *
 * This approach is intentional — desktop and mobile are optimized independently
 * while sharing the same component library and design language.
 */
import { useState, useEffect } from 'react';
import { DESKTOP_BREAKPOINT, type Breakpoint } from '@/constants';

interface BreakpointState {
  /** True when viewport width is ≥1024px (desktop/laptop layout) */
  isDesktop: boolean;
  /** True when viewport width is <1024px (mobile/tablet layout) */
  isMobile: boolean;
  /** Current named breakpoint */
  breakpoint: Breakpoint;
  /** Raw viewport width in pixels */
  width: number;
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= 1536) return '2xl';
  if (width >= 1280) return 'xl';
  if (width >= 1024) return 'lg';
  if (width >= 768) return 'md';
  if (width >= 640) return 'sm';
  return 'mobile';
}

function getState(width: number): BreakpointState {
  return {
    width,
    isDesktop: width >= DESKTOP_BREAKPOINT,
    isMobile: width < DESKTOP_BREAKPOINT,
    breakpoint: getBreakpoint(width),
  };
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() =>
    getState(typeof window !== 'undefined' ? window.innerWidth : 1280),
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);

    function handleResize(): void {
      setState(getState(window.innerWidth));
    }

    // Use matchMedia event for the primary layout switch (more performant)
    const handleMediaChange = (): void => {
      setState(getState(window.innerWidth));
    };

    window.addEventListener('resize', handleResize, { passive: true });
    mediaQuery.addEventListener('change', handleMediaChange);

    // Sync on mount
    setState(getState(window.innerWidth));

    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  return state;
}
