import { Card } from '@/components/ui/Card';
import { CheckCircle2, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { LoanRiskSummary } from '../types';

interface LoanRiskSummaryCardsProps {
  summary?: LoanRiskSummary;
}

function formatINR(val?: number): string {
  if (val === undefined || val === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function LoanRiskSummaryCards({ summary }: LoanRiskSummaryCardsProps) {
  const currentCount = summary?.current_count || 0;
  const overdueCount = summary?.overdue_count || 0;
  const atRiskCount = summary?.at_risk_count || 0;
  const totalOverdue = summary?.total_overdue_amount || 0;
  const totalOutstanding = summary?.total_outstanding_amount || 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Current */}
        <Card className="p-4 border-l-4 border-l-emerald-500 bg-emerald-50/15">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              Current
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-secondary-900">{currentCount}</div>
          <div className="mt-1 text-xs text-emerald-700 font-medium">
            Paying normally · 0 weeks overdue
          </div>
        </Card>

        {/* Overdue */}
        <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50/15">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              Overdue
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-secondary-900">{overdueCount}</div>
          <div className="mt-1 text-xs text-amber-700 font-medium">
            1–3 weeks missed · Normal recovery
          </div>
        </Card>

        {/* At Risk */}
        <Card className="p-4 border-l-4 border-l-rose-500 bg-rose-50/15">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              At Risk
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-950">{atRiskCount}</div>
          <div className="mt-1 text-xs text-rose-700 font-medium">
            4+ weeks unpaid · Requires special focus
          </div>
        </Card>

        {/* Total Overdue Amount */}
        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              Total Overdue Amount
            </span>
            <ShieldAlert className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-secondary-900">
            {formatINR(totalOverdue)}
          </div>
          <div className="mt-1 text-xs text-secondary-500">
            Across {overdueCount + atRiskCount} unpaid members (out of {formatINR(totalOutstanding)} outstanding)
          </div>
        </Card>
      </div>

    </div>
  );
}
