/**
 * VEL Finance — Dashboard Migration Calibration Banner
 * ====================================================
 * Allows calibrating operational Available Cash to ₹0.00 during migration
 * without affecting loan economics, member balances, or contractual profits.
 * Matches the behavior from Vel Finance DL.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { useLanguage } from '@/i18n';
import type { DashboardSummary } from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from 'lucide-react';

interface MigrationBannerProps {
  summary?: DashboardSummary;
  onCalibrate: () => Promise<void>;
  isCalibrating: boolean;
}

export function MigrationBanner({
  summary,
  onCalibrate,
  isCalibrating,
}: MigrationBannerProps) {
  const { t } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!summary) return null;

  const isCompleted = Boolean(summary.is_migration_completed);
  const offsetAmount = Number(summary.migration_offset || 0);
  const totalInvestment = Number(summary.total_investment || 0);
  const totalCollection = Number(summary.total_collection || 0);
  const totalDisbursement = Number(summary.total_disbursement || 0);

  // Raw uncalibrated balance = (Collections + Investments) - Disbursements
  const rawBalance = totalCollection + totalInvestment - totalDisbursement;

  const handleTriggerCalibrate = async () => {
    try {
      await onCalibrate();
      setConfirmOpen(false);
    } catch {
      // Error handled by parent toast
    }
  };

  if (!isCompleted) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-warning-200 bg-gradient-to-r from-warning-50 via-warning-50/70 to-amber-50/60 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5 rounded-lg bg-warning-100 p-2 text-warning-700">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-warning-100 text-warning-800">
                  {t('dashboard.migrationActive')}
                </span>
                <span className="text-xs text-secondary-500 font-mono">
                  {t('dashboard.uncalibratedBalance')}: {formatCurrency(rawBalance)}
                </span>
              </div>
              <p className="mt-1 text-sm text-secondary-700 max-w-2xl">
                {t('dashboard.migrationActiveSub')}
              </p>
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setConfirmOpen(true)}
              disabled={isCalibrating}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm"
              leftIcon={
                isCalibrating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )
              }
            >
              {isCalibrating ? t('dashboard.calibrating') : t('dashboard.calibrateCashZero')}
            </Button>
          </div>
        </div>

        {/* Confirmation prompt */}
        {confirmOpen && (
          <div className="mt-3 pt-3 border-t border-warning-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-secondary-700 bg-white/60 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-warning-600 flex-shrink-0" />
              <span>
                Calibrating will set Available Cash to ₹0.00 right now by applying a calibration offset of {formatCurrency(-rawBalance)}. Profit calculations and customer balances are completely unaffected.
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleTriggerCalibrate}
                disabled={isCalibrating}
              >
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Migration is completed
  return (
    <div className="rounded-xl border border-success-200/90 bg-gradient-to-r from-success-50/50 via-emerald-50/30 to-teal-50/40 p-3.5 sm:p-4 text-xs transition-all shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 rounded-lg bg-success-100 p-1.5 text-success-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-success-900">
                {t('dashboard.migrationCompleted')}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-success-100 text-success-800">
                {t('dashboard.calibrationOffset')}: +{formatCurrency(offsetAmount)}
              </span>
            </div>
            <p className="text-[11px] text-secondary-600 mt-0.5 truncate">
              {t('dashboard.migrationCompletedSub')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary-600 hover:text-secondary-900 transition-colors px-2 py-1 rounded hover:bg-secondary-100/50"
          >
            <span>{showDetails ? t('dashboard.calibrationHide') : t('dashboard.calibrationDetails')}</span>
            {showDetails ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmOpen(true)}
            disabled={isCalibrating}
            className="text-[11px] text-secondary-600 hover:text-primary-700"
            leftIcon={
              isCalibrating ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )
            }
          >
            {t('dashboard.recalibrateCash')}
          </Button>
        </div>
      </div>

      {/* Confirmation prompt for recalibration */}
      {confirmOpen && (
        <div className="mt-3 pt-3 border-t border-success-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-secondary-700 bg-white/70 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary-600 flex-shrink-0" />
            <span>
              Recalibrate Available Cash to ₹0.00 based on the current database totals? New calibration offset will be {formatCurrency(-rawBalance)}.
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleTriggerCalibrate}
              disabled={isCalibrating}
            >
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      )}

      {/* Expandable Breakdown Drawer */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-success-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/80 p-3 rounded-lg">
          <div>
            <p className="text-[10px] text-secondary-500 uppercase tracking-wider font-semibold">
              {t('dashboard.totalInvestments')}
            </p>
            <p className="text-xs font-bold font-mono text-secondary-900 mt-0.5">
              +{formatCurrency(totalInvestment)}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-secondary-500 uppercase tracking-wider font-semibold">
              {t('dashboard.totalCollections')}
            </p>
            <p className="text-xs font-bold font-mono text-secondary-900 mt-0.5">
              +{formatCurrency(totalCollection)}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-secondary-500 uppercase tracking-wider font-semibold">
              {t('dashboard.totalDisbursed')}
            </p>
            <p className="text-xs font-bold font-mono text-error-700 mt-0.5">
              -{formatCurrency(totalDisbursement)}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-secondary-500 uppercase tracking-wider font-semibold">
              {t('dashboard.calibrationOffset')}
            </p>
            <p className="text-xs font-bold font-mono text-success-700 mt-0.5">
              +{formatCurrency(offsetAmount)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
