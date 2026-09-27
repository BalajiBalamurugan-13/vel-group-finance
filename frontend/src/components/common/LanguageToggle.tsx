import { useLanguage } from '@/i18n';
import { cn } from '@/lib/cn';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  className?: string;
  showIcon?: boolean;
}

export function LanguageToggle({ className, showIcon = true }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-border bg-surface p-0.5 shadow-xs',
        className,
      )}
      role="group"
      aria-label="Language selection"
    >
      {showIcon && (
        <Globe
          className="ml-1.5 mr-1 h-3.5 w-3.5 text-secondary-400 hidden sm:block"
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={cn(
          'flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold transition-all duration-150 min-h-[32px] min-w-[34px]',
          language === 'en'
            ? 'bg-primary-600 text-white shadow-xs font-bold'
            : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50',
        )}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('ta')}
        className={cn(
          'flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold transition-all duration-150 min-h-[32px] min-w-[40px]',
          language === 'ta'
            ? 'bg-primary-600 text-white shadow-xs font-bold'
            : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50',
        )}
        aria-pressed={language === 'ta'}
      >
        தமிழ்
      </button>
    </div>
  );
}
