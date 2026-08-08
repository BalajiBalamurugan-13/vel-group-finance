/**
 * VEL Finance — useDocumentTitle Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Sets the document title with the application name suffix.
 *
 * Usage:
 *   useDocumentTitle('Dashboard');
 *   // → "Dashboard | VEL Finance - Group Finance"
 */
import { useEffect } from 'react';
import { APP } from '@/constants';

export function useDocumentTitle(pageTitle: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${pageTitle} | ${APP.PRODUCT_NAME}`;

    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);
}
