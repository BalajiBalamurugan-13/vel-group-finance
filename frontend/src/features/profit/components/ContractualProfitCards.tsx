import { Card } from '@/components/ui/Card';
import { TrendingUp, Banknote, ShieldCheck, PieChart, Clock } from 'lucide-react';
import type { ProfitSummary } from '../types';

interface ContractualProfitCardsProps {
  summary?: ProfitSummary;
}

function formatINR(val?: number): string {
  if (val === undefined || val === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function ContractualProfitCards({ summary }: ContractualProfitCardsProps) {
  const capitalDeployed = summary?.total_loan_capital_deployed || 0;
  const contractualRepayment = summary?.total_contractual_repayment || 0;
  const contractualProfit = summary?.total_contractual_profit || 0;
  const actualCollections = summary?.total_actual_collections || 0;
  const outstanding = summary?.total_outstanding || 0;
  const principalRecovered = summary?.principal_recovered || 0;
  const principalRemaining = summary?.principal_remaining || 0;

  const recoveryPercent =
    capitalDeployed > 0
      ? Math.min(100, Math.round((principalRecovered / capitalDeployed) * 100))
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-secondary-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Loan Economics &amp; Contractual Profit
          </h3>
        </div>
      </div>

      {/* Main 3 High-Impact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Loan Capital Deployed */}
        <Card className="p-4 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              Loan Capital Deployed
            </span>
            <Banknote className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-secondary-900">
            {formatINR(capitalDeployed)}
          </div>
          <div className="mt-1 text-xs text-secondary-500">
            Sum of full loan principal issued to members
          </div>
        </Card>

        {/* Total Contractual Repayment */}
        <Card className="p-4 border-l-4 border-l-violet-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
              Contractual Repayment
            </span>
            <Clock className="h-4 w-4 text-violet-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-secondary-900">
            {formatINR(contractualRepayment)}
          </div>
          <div className="mt-1 text-xs text-secondary-500">
            Total scheduled repayment: Weekly Installment × Weeks
          </div>
        </Card>

        {/* Contractual Profit */}
        <Card className="p-4 border-l-4 border-l-emerald-600 bg-emerald-50/25">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Contractual Profit
            </span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Repayment − Principal
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">
            {formatINR(contractualProfit)}
          </div>
          <div className="mt-1 text-xs text-emerald-700 font-medium">
            Contractual margin if schedules completed
          </div>
        </Card>
      </div>

      {/* Cash Collections vs Outstanding & Principal Recovery Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Cash Collections vs Outstanding */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-secondary-800 uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="h-3.5 w-3.5 text-secondary-500" />
              Collections vs Outstanding
            </h4>
            <span className="text-[11px] text-secondary-400">Cash movement</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-secondary-50 p-3 rounded-lg border border-border">
              <span className="text-[10px] text-secondary-400 font-medium uppercase block">Actual Collections</span>
              <span className="text-lg font-bold text-emerald-700">{formatINR(actualCollections)}</span>
              <span className="text-[11px] text-secondary-500 block mt-0.5">Physical cash collected</span>
            </div>
            <div className="bg-secondary-50 p-3 rounded-lg border border-border">
              <span className="text-[10px] text-secondary-400 font-medium uppercase block">Total Outstanding</span>
              <span className="text-lg font-bold text-amber-700">{formatINR(outstanding)}</span>
              <span className="text-[11px] text-secondary-500 block mt-0.5">Remaining installments</span>
            </div>
          </div>
        </Card>

        {/* Principal Recovery (Section 21) */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-secondary-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary-600" />
              Principal Recovery Analysis
            </h4>
            <span className="text-xs font-bold text-primary-700">{recoveryPercent}%</span>
          </div>

          <div className="w-full bg-secondary-100 rounded-full h-2.5 my-3 overflow-hidden">
            <div
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${recoveryPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-secondary-400 block text-[10px] uppercase font-medium">Principal Recovered</span>
              <span className="font-bold text-secondary-900">{formatINR(principalRecovered)}</span>
            </div>
            <div className="text-right">
              <span className="text-secondary-400 block text-[10px] uppercase font-medium">Principal Remaining</span>
              <span className="font-bold text-secondary-900">{formatINR(principalRemaining)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
