/**
 * VEL Finance — Desktop Header Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Top header bar for the desktop layout.
 * Contains: search placeholder (Ctrl+K hint), notification icon slot.
 */
import { Search, Bell } from 'lucide-react';

export function Header() {
  return (
    <header
      className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-surface border-b border-border"
      role="banner"
    >
      {/* ── Search (Ctrl+K — Future Global Search) ────────────────────── */}
      <div className="flex-1 max-w-md">
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-secondary-50 text-secondary-400 hover:bg-secondary-100 hover:border-border-strong transition-colors duration-fast min-h-[40px] text-sm"
          aria-label="Open global search"
          title="Search (Ctrl+K)"
        >
          <Search className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">Search...</span>
          <kbd
            className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono bg-secondary-200 text-secondary-500 rounded border border-border"
            aria-label="Keyboard shortcut: Control K"
          >
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* ── Right Actions ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 ml-4">
        {/* Notifications — Placeholder for future implementation */}
        <button
          className="relative p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 transition-colors duration-fast min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Notifications (coming soon)"
          title="Notifications"
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* User Avatar — Placeholder for future auth */}
        <button
          className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm min-h-[44px] min-w-[44px]"
          aria-label="User menu (coming soon)"
          title="User menu"
        >
          VF
        </button>
      </div>
    </header>
  );
}
