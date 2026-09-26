/**
 * VEL Finance — Bottom Navigation Component (Mobile)
 * ─────────────────────────────────────────────────────────────────────────────
 * Per 09_DESIGN_SYSTEM.md:
 * - Maximum 5 items
 * - Items: Dashboard, Groups, Collections, Reports, Settings
 * - Active state per current route
 * - Large touch targets (44px minimum)
 *
 * Per 08_UI_UX_GUIDELINES.md:
 * - Every important action reachable within two taps
 * - Optimized for one-handed usage
 */
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Wallet,
  Menu as MenuIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/constants';
import type { NavItem } from '@/types';
import { MobileMenu } from './MobileMenu';

// ── Navigation Config ─────────────────────────────────────────────────────────
// Maximum 5 items per design system (Dashboard | Groups | Members | Collections | Menu)

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Groups', path: ROUTES.GROUPS, icon: Users },
  { label: 'Members', path: ROUTES.MEMBERS, icon: UserCheck },
  { label: 'Collections', path: ROUTES.COLLECTIONS, icon: Wallet },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function BottomNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-sticky bg-surface border-t border-border"
        aria-label="Bottom navigation"
      >
        {/* Safe area padding for iOS home indicator */}
        <div className="flex items-stretch h-16 pb-safe">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <BottomNavItem key={item.path} item={item} />
          ))}
          <button
            onClick={() => setIsMenuOpen(true)}
            aria-label="Menu"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2',
              'text-xs font-medium transition-colors duration-fast min-h-[44px]',
              isMenuOpen
                ? 'text-primary-600'
                : 'text-secondary-400 hover:text-secondary-600',
            )}
          >
            <MenuIcon
              className={cn(
                'w-5 h-5',
                isMenuOpen ? 'text-primary-600' : 'text-secondary-400',
              )}
              aria-hidden="true"
            />
            <span>Menu</span>
          </button>
        </div>
      </nav>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}

// ── BottomNavItem ─────────────────────────────────────────────────────────────

interface BottomNavItemProps {
  item: NavItem;
}

function BottomNavItem({ item }: BottomNavItemProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      aria-label={item.label}
      className={({ isActive }) =>
        cn(
          'flex-1 flex flex-col items-center justify-center gap-1 py-2',
          'text-xs font-medium transition-colors duration-fast min-h-[44px]',
          isActive
            ? 'text-primary-600'
            : 'text-secondary-400 hover:text-secondary-600',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'w-5 h-5',
              isActive ? 'text-primary-600' : 'text-secondary-400',
            )}
            aria-hidden="true"
          />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
