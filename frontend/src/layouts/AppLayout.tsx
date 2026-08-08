/**
 * VEL Finance — Adaptive App Layout
 * ─────────────────────────────────────────────────────────────────────────────
 * The primary layout orchestrator.
 *
 * Per 12_AI_CONTEXT.md / 08_UI_UX_GUIDELINES.md:
 * This application uses ADAPTIVE RESPONSIVE DESIGN — not just CSS responsiveness.
 *
 * The layout is not just visually reflowed — it is structurally different:
 * - Desktop (≥1024px): Sidebar + Header + Content (optimized for office staff)
 * - Mobile (<1024px): MobileHeader + Content + BottomNavigation (optimized for collectors)
 *
 * Both layouts share the same page components but present them differently.
 */
import { useBreakpoint } from '@/hooks';
import { DesktopLayout } from './DesktopLayout';
import { MobileLayout } from './MobileLayout';

export function AppLayout() {
  const { isDesktop } = useBreakpoint();

  if (isDesktop) {
    return <DesktopLayout />;
  }

  return <MobileLayout />;
}
