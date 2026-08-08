/**
 * VEL Finance — Mobile Header Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Sticky header for mobile layout.
 * Optimized for one-handed usage (per 08_UI_UX_GUIDELINES.md).
 */
import { Search } from 'lucide-react';
import { APP } from '@/constants';

export function MobileHeader() {
  return (
    <header
      className="sticky top-0 z-sticky flex-shrink-0 h-14 flex items-center justify-between px-4 bg-surface border-b border-border"
      role="banner"
    >
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary-600 flex items-center justify-center">
          <span className="text-white font-bold text-xs" aria-hidden="true">
            V
          </span>
        </div>
        <span className="font-semibold text-secondary-900 text-sm">{APP.NAME}</span>
      </div>

      {/* Search icon — placeholder for future search */}
      <button
        className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Search"
        title="Search"
      >
        <Search className="w-5 h-5" aria-hidden="true" />
      </button>
    </header>
  );
}
