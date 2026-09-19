import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/format';
import { Wallet, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import type { TodayCollectionSummary, WeeklyCollectionSummary } from '../types';

interface CollectionSummaryCardsProps {
  todaySummary?: TodayCollectionSummary;
  weeklySummary?: WeeklyCollectionSummary;
  isLoading?: boolean;
}

export function CollectionSummaryCards({
  todaySummary,
  weeklySummary,
  isLoading,
}: CollectionSummaryCardsProps) {
  const todayTotal = Number(todaySummary?.total_collected || 0);
  const todayCount = todaySummary?.collection_count || 0;

  const weeklyExpected = Number(weeklySummary?.total_expected || 0);
  const weeklyCollected = Number(weeklySummary?.total_collected || 0);
  const weeklyPending = Number(weeklySummary?.total_pending || 0);

  const overallProgress =
    weeklyExpected > 0
      ? Math.min(100, Math.round((weeklyCollected / weeklyExpected) * 100))
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {/* 1. Today's Collections */}
      <Card className="p-3.5 flex flex-col justify-between border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-secondary-500 uppercase tracking-wider">
            Today's Collection
          </span>
          <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-lg lg:text-xl font-bold text-secondary-900">
            {isLoading ? '—' : formatCurrency(todayTotal)}
          </div>
          <p className="text-xs text-secondary-500 mt-0.5">
            {todayCount} {todayCount === 1 ? 'payment' : 'payments'} today
          </p>
        </div>
      </Card>

      {/* 2. Total Expected This Week */}
      <Card className="p-3.5 flex flex-col justify-between border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-secondary-500 uppercase tracking-wider">
            Weekly Expected
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-lg lg:text-xl font-bold text-secondary-900">
            {isLoading ? '—' : formatCurrency(weeklyExpected)}
          </div>
          <p className="text-xs text-secondary-500 mt-0.5">
            Collected: {formatCurrency(weeklyCollected)}
          </p>
        </div>
      </Card>

      {/* 3. Total Pending */}
      <Card className="p-3.5 flex flex-col justify-between border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-secondary-500 uppercase tracking-wider">
            Pending Collection
          </span>
          <div className="w-8 h-8 rounded-lg bg-warning-50 text-warning-600 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-lg lg:text-xl font-bold text-warning-700">
            {isLoading ? '—' : formatCurrency(weeklyPending)}
          </div>
          <p className="text-xs text-secondary-500 mt-0.5">Across active groups</p>
        </div>
      </Card>

      {/* 4. Weekly Collection Progress */}
      <Card className="p-3.5 flex flex-col justify-between border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-secondary-500 uppercase tracking-wider">
            Weekly Progress
          </span>
          <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-lg lg:text-xl font-bold text-success-700">
            {isLoading ? '—' : `${overallProgress}%`}
          </div>
          <div className="w-full bg-secondary-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-success-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
