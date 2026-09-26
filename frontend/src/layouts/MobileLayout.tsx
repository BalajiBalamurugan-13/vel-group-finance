/**
 * VEL Finance — Mobile Layout
 * ─────────────────────────────────────────────────────────────────────────────
 * Mobile layout: Fixed Header + Scrollable Content + Fixed Bottom Navigation.
 * Per 09_DESIGN_SYSTEM.md: Mobile = sticky header + scrollable content + bottom nav.
 * Per 08_UI_UX_GUIDELINES.md: Optimized for one-handed field collector usage.
 *
 * Uses 100dvh (dynamic viewport height) to properly account for mobile browser
 * toolbars (iOS Safari, Chrome for Android, etc). Falls back to 100vh for
 * browsers that don't support dvh.
 *
 * Bottom nav is position:fixed to always remain visible at the viewport bottom,
 * never scrolling off-screen or hiding behind browser chrome.
 */
import { Outlet } from 'react-router-dom';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNavigation } from '@/components/layout/BottomNavigation';

export function MobileLayout() {
  return (
    <div className="mobile-layout-root">
      {/* Fixed top header */}
      <MobileHeader />

      {/* Scrollable content area with VEL Finance watermark */}
      <main
        className="mobile-layout-content vel-content-area"
        id="main-content"
        tabIndex={-1}
        aria-label="Main content"
      >
        <Outlet />
      </main>

      {/* Fixed bottom navigation — always visible */}
      <BottomNavigation />
    </div>
  );
}
