/**
 * VEL Finance — Sidebar Component (Desktop)
 * ─────────────────────────────────────────────────────────────────────────────
 * Desktop sidebar navigation.
 * Per 08_UI_UX_GUIDELINES.md + 09_DESIGN_SYSTEM.md:
 * - Active state per current route
 * - Collapsible (persisted via localStorage)
 * - Lucide icons only
 */
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  TrendingUp,
  ShieldAlert,
  BarChart3,
  Settings,
  FileBadge,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import velLogo from '@/assets/Vel finance logo white.png';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/constants';
import { STORAGE_KEYS } from '@/utils';
import { useLocalStorage } from '@/hooks';
import { DURATION, EASING } from '@/constants/tokens';
import { useLanguage } from '@/i18n';
import type { NavItem } from '@/types';

// ── Component ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>(
    STORAGE_KEYS.SIDEBAR_COLLAPSED,
    false,
  );

  const navItems = [
    { label: t('nav.dashboard'), path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: t('nav.groups'), path: ROUTES.GROUPS, icon: Users },
    { label: t('nav.members'), path: ROUTES.MEMBERS, icon: UserCheck },
    { label: t('nav.profit'), path: ROUTES.PROFIT, icon: TrendingUp },
    { label: t('nav.loanRisk'), path: ROUTES.LOAN_RISK, icon: ShieldAlert },
    { label: t('nav.reports'), path: ROUTES.REPORTS, icon: BarChart3 },
    { label: t('nav.schemes'), path: ROUTES.SCHEMES, icon: FileBadge },
    { label: t('nav.settings'), path: ROUTES.SETTINGS, icon: Settings },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 256 }}
      transition={{ duration: DURATION.normal, ease: EASING.default }}
      className="flex flex-col h-full bg-surface border-r border-border overflow-hidden flex-shrink-0"
      aria-label="Primary navigation"
    >
      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <div className="h-16 flex items-center px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Logo mark */}
          <img
            src={velLogo}
            alt="VEL Finance"
            className="h-9 w-9 object-contain flex-shrink-0"
          />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: DURATION.fast, ease: EASING.out }}
                className="overflow-hidden whitespace-nowrap"
              >
                <p className="text-sm font-semibold text-secondary-900">VEL Finance</p>
                <p className="text-xs text-secondary-400">Group Finance</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" aria-label="Main">
        {navItems.map((item) => (
          <SidebarItem key={item.path} item={item} isCollapsed={isCollapsed} />
        ))}
      </nav>

      {/* ── Collapse Toggle ─────────────────────────────────────────────── */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg',
            'text-sm text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700',
            'transition-colors duration-fast min-h-[44px]',
            isCollapsed && 'justify-center',
          )}
          aria-label={isCollapsed ? t('nav.collapse') : t('nav.collapse')}
          title={isCollapsed ? t('nav.collapse') : t('nav.collapse')}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span>{t('nav.collapse')}</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}

// ── SidebarItem ───────────────────────────────────────────────────────────────

interface SidebarItemProps {
  item: NavItem;
  isCollapsed: boolean;
}

function SidebarItem({ item, isCollapsed }: SidebarItemProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      title={item.label}
      aria-label={item.label}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
          'transition-colors duration-fast min-h-[44px]',
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-700',
          isCollapsed && 'justify-center',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'w-5 h-5 flex-shrink-0',
              isActive ? 'text-primary-600' : 'text-secondary-400',
            )}
            aria-hidden="true"
          />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: DURATION.fast, ease: EASING.out }}
                className="overflow-hidden whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
        </>
      )}
    </NavLink>
  );
}
