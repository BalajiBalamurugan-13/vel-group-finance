import { NavLink } from 'react-router-dom';
import { BarChart3, FileBadge, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/cn';
import { DURATION, EASING } from '@/constants/tokens';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { label: 'Reports', path: ROUTES.REPORTS, icon: BarChart3 },
  { label: 'Schemes', path: ROUTES.SCHEMES, icon: FileBadge },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast }}
            className="fixed inset-0 z-[100] bg-secondary-900/20"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Popover (Matches Card component styling) */}
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: EASING.out }}
            className="fixed right-2 z-[101] mb-2 bottom-[calc(4rem+env(safe-area-inset-bottom))] w-44 rounded-xl border border-border bg-surface p-1 shadow-sm"
            role="dialog"
            aria-label="Mobile Menu"
          >
            <nav className="flex flex-col">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-[44px] items-center gap-3 rounded-lg px-3 transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-secondary-700 hover:bg-secondary-50'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={cn('h-5 w-5', isActive ? 'text-primary-600' : 'text-secondary-400')} />
                        <span className="font-medium">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
