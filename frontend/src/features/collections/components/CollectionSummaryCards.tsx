import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/format';
import { useLanguage } from '@/i18n';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import type { WeeklyCollectionSummary } from '../types';

interface CollectionSummaryCardsProps {
  weeklySummary?: WeeklyCollectionSummary;
  isLoading?: boolean;
  selectedGroupName?: string;
}

export function CollectionSummaryCards({
  weeklySummary,
  isLoading,
  selectedGroupName,
}: CollectionSummaryCardsProps) {
  const { t, language } = useLanguage();

  const weeklyExpected = Number(weeklySummary?.total_expected || 0);
  const weeklyCollected = Number(weeklySummary?.total_collected || 0);
  const weeklyPending = Number(weeklySummary?.total_pending || 0);

  const rawWeeklyProgress =
    weeklyExpected > 0 ? (weeklyCollected / weeklyExpected) * 100 : 0;
  const overallProgress =
    rawWeeklyProgress > 0 && rawWeeklyProgress < 1
      ? Number(rawWeeklyProgress.toFixed(1))
      : Math.min(100, Math.round(rawWeeklyProgress));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      {/* 1. Total Expected This Week */}
      <Card className="p-3.5 flex flex-col justify-between border border-border shadow-sm">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-secondary-500 uppercase tracking-wider block truncate">
              {t('dashboard.weeklyExpected')}
            </span>
            <span className="text-[10px] text-blue-700 font-semibold block truncate">
              {selectedGroupName || (language === 'ta' ? `அனைத்து ${weeklySummary?.groups_summary?.length || 33} குழுக்கள்` : `All ${weeklySummary?.groups_summary?.length || 33} Groups`)}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-lg lg:text-xl font-bold text-secondary-900">
            {isLoading ? '—' : formatCurrency(weeklyExpected)}
          </div>
          <p className="text-xs text-secondary-500 mt-0.5">
            {t('dashboard.collected')}: {formatCurrency(weeklyCollected)}
          </p>
        </div>
      </Card>

      {/* 3. Total Pending */}
      <Card className="p-3.5 flex flex-col justify-between border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-secondary-500 uppercase tracking-wider">
            {t('dashboard.pendingThisWeek')}
          </span>
          <div className="w-8 h-8 rounded-lg bg-warning-50 text-warning-600 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-lg lg:text-xl font-bold text-warning-700">
            {isLoading ? '—' : formatCurrency(weeklyPending)}
          </div>
          <p className="text-xs text-secondary-500 mt-0.5 truncate">
            {selectedGroupName
              ? (language === 'ta' ? `${selectedGroupName} குழுவிற்கு` : `For ${selectedGroupName}`)
              : (language === 'ta' ? `${weeklySummary?.groups_summary?.length || 33} செயலில் உள்ள குழுக்களில்` : `Across ${weeklySummary?.groups_summary?.length || 33} active groups`)}
          </p>
        </div>
      </Card>

      {/* 4. Weekly Collection Progress */}
      <Card className="p-3.5 flex flex-col justify-between border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-secondary-500 uppercase tracking-wider">
            {t('dashboard.weeklyProgress')}
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
