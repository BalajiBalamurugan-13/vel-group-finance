/**
 * VEL Finance — Desktop Layout
 * ─────────────────────────────────────────────────────────────────────────────
 * Full desktop layout: Sidebar (left) + [Header + Content] (right).
 * Per 09_DESIGN_SYSTEM.md: Sidebar + Header + Main Content area.
 */
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export function DesktopLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <Header />

        {/* Scrollable content */}
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
          tabIndex={-1}
          aria-label="Main content"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
