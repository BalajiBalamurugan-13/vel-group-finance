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
        description="You don't have any active financial schemes yet. Create a new scheme to get started."
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {schemes.map((scheme) => (
        <Card key={scheme.id} className="flex flex-col p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-secondary-900">{scheme.scheme_name}</h3>
              {scheme.description && (
                <p className="mt-1 text-sm text-secondary-500 line-clamp-2">
                  {scheme.description}
                </p>
              )}
            </div>
            <Badge variant={scheme.status === 'Active' ? 'success' : 'neutral'}>
              {scheme.status}
            </Badge>
          </div>

          <div className="mb-6 flex-1 space-y-3 rounded-lg bg-secondary-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Loan Amount</span>
              <span className="font-medium text-secondary-900">{formatMoney(scheme.loan_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Weekly Installment</span>
              <span className="font-medium text-secondary-900">{formatMoney(scheme.weekly_installment)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Duration</span>
              <span className="font-medium text-secondary-900">{scheme.total_weeks} Weeks</span>
            </div>
            <div className="flex justify-between text-sm border-t border-secondary-200 pt-2">
              <span className="text-secondary-500">Note Cost</span>
              <span className="font-medium text-secondary-900">{formatMoney(scheme.note_cost)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              leftIcon={<Edit2 className="h-4 w-4" />}
              onClick={() => onEdit(scheme)}
            >
              Edit Name
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              leftIcon={scheme.status === 'Active' ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              disabled={isPending}
              onClick={() => {
                const newStatus = scheme.status === 'Active' ? 'Inactive' : 'Active';
                updateStatus({ id: scheme.id, payload: { status: newStatus } });
              }}
            >
              {scheme.status === 'Active' ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
