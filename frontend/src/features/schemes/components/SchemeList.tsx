import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Edit2, ToggleLeft, ToggleRight, FileBadge } from 'lucide-react';
import { useLanguage } from '@/i18n';
import type { Scheme } from '../types';
import { useUpdateSchemeStatus } from '../hooks/useSchemes';
import { EmptyState } from '@/components/common/EmptyState';

interface SchemeListProps {
  schemes: Scheme[];
  onEdit: (scheme: Scheme) => void;
}

export function SchemeList({ schemes, onEdit }: SchemeListProps) {
  const { language } = useLanguage();
  const { mutate: updateStatus, isPending } = useUpdateSchemeStatus();

  if (schemes.length === 0) {
    return (
      <EmptyState
        icon={<FileBadge className="w-12 h-12 text-secondary-300" />}
        title={language === 'ta' ? 'செயலில் உள்ள திட்டங்கள் எதுவும் இல்லை' : 'No active schemes found'}
        description={
          language === 'ta'
            ? 'குழுக்களுக்கான நிதி விதிகளை வரையறுக்க ஒரு புதிய திட்டத்தை உருவாக்கவும்.'
            : 'Create a new scheme to define the financial terms for your groups.'
        }
      />
    );
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {schemes.map((scheme) => (
        <Card key={scheme.id} className="flex flex-col p-0 overflow-hidden">
          {/* Card Header */}
          <div className="px-4 pt-3 pb-2 border-b border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-secondary-900 text-sm truncate leading-snug">
                    {scheme.scheme_name}
                  </h3>
                  {scheme.scheme_code && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-secondary-100 text-secondary-600">
                      {scheme.scheme_code}
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant={scheme.status === 'Active' ? 'success' : 'neutral'}
                className="flex-shrink-0"
              >
                {scheme.status === 'Active'
                  ? (language === 'ta' ? 'செயலில்' : 'Active')
                  : (language === 'ta' ? 'செயலிழந்தது' : 'Inactive')}
              </Badge>
            </div>
            {scheme.description && (
              <p className="mt-1 text-xs text-secondary-500 line-clamp-1">
                {scheme.description}
              </p>
            )}
          </div>

          {/* Financial Grid */}
          <div className="px-4 py-2.5 bg-secondary-50/60 border-b border-border flex-1">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {/* Loan Amount — Primary KPI */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400">
                  {language === 'ta' ? 'கடன் தொகை' : 'Loan Amount'}
                </div>
                <div className="text-sm font-bold text-secondary-900 tabular-nums font-mono mt-0.5">
                  {formatMoney(scheme.loan_amount)}
                </div>
              </div>

              {/* Weekly Installment */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400">
                  {language === 'ta' ? 'வாரத் தவணை' : 'Weekly Installment'}
                </div>
                <div className="text-sm font-bold text-primary-700 tabular-nums font-mono mt-0.5">
                  {formatMoney(scheme.weekly_installment)}
                </div>
              </div>

              {/* Duration */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400">
                  {language === 'ta' ? 'கால அளவு' : 'Duration'}
                </div>
                <div className="text-xs font-semibold text-secondary-800 mt-0.5">
                  {scheme.total_weeks} {language === 'ta' ? 'வாரங்கள்' : 'Weeks'}
                </div>
              </div>

              {/* Note Cost */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400">
                  {language === 'ta' ? 'நோட் செலவு' : 'Note Cost'}
                </div>
                <div className="text-xs font-semibold text-secondary-800 tabular-nums font-mono mt-0.5">
                  {formatMoney(scheme.note_cost)}
                </div>
              </div>
            </div>
          </div>

          {/* Actions — Compact, bottom-aligned */}
          <div className="px-4 py-2 border-t border-border flex items-center gap-2 bg-secondary-50/50">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              onClick={() => onEdit(scheme)}
              className="text-secondary-600 hover:text-secondary-900"
            >
              {language === 'ta' ? 'திருத்து' : 'Edit'}
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              leftIcon={
                scheme.status === 'Active' ? (
                  <ToggleRight className="h-3.5 w-3.5" />
                ) : (
                  <ToggleLeft className="h-3.5 w-3.5" />
                )
              }
              disabled={isPending}
              onClick={() => {
                const newStatus =
                  scheme.status === 'Active' ? 'Inactive' : 'Active';
                updateStatus({
                  id: scheme.id,
                  payload: { status: newStatus },
                });
              }}
              className={
                scheme.status === 'Active'
                  ? 'text-error-600 hover:text-error-700 hover:bg-error-50'
                  : 'text-success-600 hover:text-success-700 hover:bg-success-50'
              }
            >
              {scheme.status === 'Active'
                ? (language === 'ta' ? 'செயலிழக்கச் செய்' : 'Deactivate')
                : (language === 'ta' ? 'செயல்படுத்து' : 'Activate')}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
