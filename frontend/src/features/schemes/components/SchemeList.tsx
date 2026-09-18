import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Edit2, ToggleLeft, ToggleRight, FileBadge } from 'lucide-react';
import type { Scheme } from '../types';
import { useUpdateSchemeStatus } from '../hooks/useSchemes';
import { EmptyState } from '@/components/common/EmptyState';

interface SchemeListProps {
  schemes: Scheme[];
  onEdit: (scheme: Scheme) => void;
}

export function SchemeList({ schemes, onEdit }: SchemeListProps) {
  const { mutate: updateStatus, isPending } = useUpdateSchemeStatus();

  if (schemes.length === 0) {
    return (
      <EmptyState
        icon={<FileBadge className="w-12 h-12 text-secondary-300" />}
        title="No active schemes found"
        description="Create a new scheme to define the financial terms for your groups."
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
          <div className="px-4 pt-3.5 pb-3 border-b border-border/50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-secondary-900 text-sm truncate leading-snug">
                  {scheme.scheme_name}
                </h3>
                {scheme.scheme_code && (
                  <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-secondary-100 text-secondary-600">
                    {scheme.scheme_code}
                  </span>
                )}
              </div>
              <Badge
                variant={scheme.status === 'Active' ? 'success' : 'neutral'}
                className="flex-shrink-0"
              >
                {scheme.status}
              </Badge>
            </div>
            {scheme.description && (
              <p className="mt-1.5 text-xs text-secondary-500 line-clamp-2">
                {scheme.description}
              </p>
            )}
          </div>

          {/* Financial Grid — Natural hierarchy, not edge-to-edge stretch */}
          <div className="px-4 py-3 flex-1">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {/* Loan Amount — Primary KPI */}
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-secondary-400">
                  Loan Amount
                </div>
                <div className="text-base font-bold text-secondary-900 tabular-nums">
                  {formatMoney(scheme.loan_amount)}
                </div>
              </div>

              {/* Weekly Installment */}
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-secondary-400">
                  Weekly Installment
                </div>
                <div className="text-base font-bold text-primary-700 tabular-nums">
                  {formatMoney(scheme.weekly_installment)}
                </div>
              </div>

              {/* Duration */}
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-secondary-400">
                  Duration
                </div>
                <div className="text-sm font-semibold text-secondary-900">
                  {scheme.total_weeks} Weeks
                </div>
              </div>

              {/* Note Cost */}
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-secondary-400">
                  Note Cost
                </div>
                <div className="text-sm font-semibold text-secondary-900 tabular-nums">
                  {formatMoney(scheme.note_cost)}
                </div>
              </div>
            </div>
          </div>

          {/* Actions — Compact, bottom-aligned */}
          <div className="px-4 py-2.5 border-t border-border/50 flex items-center gap-2 bg-secondary-50/40">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              onClick={() => onEdit(scheme)}
              className="text-secondary-600 hover:text-secondary-900"
            >
              Edit
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
              {scheme.status === 'Active' ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
