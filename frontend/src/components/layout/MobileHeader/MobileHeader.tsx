/**
 * VEL Finance — Mobile Header Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise mobile header with VEL Finance branded identity.
 * Uses the actual VEL Finance logo asset for professional presentation.
 */
import velLogo from '@/assets/Vel finance logo white.png';

export function MobileHeader() {
  return (
    <header
      className="sticky top-0 z-sticky flex-shrink-0 h-14 flex items-center px-4 bg-surface border-b border-border"
      role="banner"
    >
      <div className="flex items-center gap-2.5">
        <img
          src={velLogo}
          alt="VEL Finance"
          className="h-8 w-8 object-contain"
        />
        <div className="leading-tight">
          <span className="font-bold text-secondary-900 text-sm tracking-tight block">
            VEL Finance
          </span>
          <span className="text-[10px] text-secondary-400 font-medium">
            Group Finance
          </span>
        </div>
      </div>
    </header>
  );
}
