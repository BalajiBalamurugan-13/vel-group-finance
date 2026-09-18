/**
 * VEL Finance — Mobile Layout
 * ─────────────────────────────────────────────────────────────────────────────
 * Mobile layout: Sticky Header + Scrollable Content + Bottom Navigation.
 * Per 09_DESIGN_SYSTEM.md: Mobile = sticky header + scrollable content + bottom nav.
 * Per 08_UI_UX_GUIDELINES.md: Optimized for one-handed field collector usage.
 */
import { Outlet } from 'react-router-dom';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNavigation } from '@/components/layout/BottomNavigation';

export function MobileLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Sticky top header */}
      <MobileHeader />

      {/* Scrollable content area with VEL Finance watermark */}
      <main
        className="flex-1 overflow-y-auto vel-content-area"
        id="main-content"
        tabIndex={-1}
        aria-label="Main content"
      >
        <Outlet />
      </main>

      {/* Sticky bottom navigation */}
      <BottomNavigation />
    </div>
  );
}
