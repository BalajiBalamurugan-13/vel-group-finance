/**
 * VEL Finance — 404 Not Found Page
 */
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { useDocumentTitle } from '@/hooks';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  useDocumentTitle('Page Not Found');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      {/* Status Code */}
      <p className="text-8xl font-bold text-primary-100 select-none" aria-hidden="true">
        404
      </p>

      {/* Content */}
      <div className="mt-4 space-y-3 max-w-md">
        <h1 className="text-2xl font-semibold text-secondary-900">
          Page not found
        </h1>
        <p className="text-sm text-secondary-500">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>

      {/* Action */}
      <div className="mt-8">
        <Link to={ROUTES.DASHBOARD} className="inline-flex">
          <Button leftIcon={<Home className="w-4 h-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
