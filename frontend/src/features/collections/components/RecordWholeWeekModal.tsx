import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Zap,
  AlertCircle,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { useGroups } from '@/features/groups';
import {
  useRecordWeekPreview,
  useRecordWholeWeek,
} from '../hooks/useCollections';
import type { RecordWeekResponse } from '../types';
import { useLanguage } from '@/i18n';
import { cn } from '@/lib/cn';

interface RecordWholeWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: RecordWeekResponse) => void;
}

export type CollectionDayFilter = 'all' | 'sunday' | 'monday';

// Helpers for quick date selection
function getNearestSunday(): string {
  const d = new Date();
  const day = d.getDay(); // 0 is Sunday
  const diff = day === 0 ? 0 : -day; // Prioritize this week's Sunday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function getNearestMonday(): string {
  const d = new Date();
  const day = d.getDay();
  // If today is Sunday (0), Monday is +1; if today is Monday (1), diff is 0
  const diff = day === 0 ? 1 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
}

function getGroupDayOfWeek(group: { start_date?: string | null }): number {
  if (!group.start_date) return 0; // Default to Sunday (0) for historical groups
  try {
    const [y, m, d] = group.start_date.split('-').map(Number);
    if (!y || !m || !d) return 0;
    return new Date(y, m - 1, d).getDay();
  } catch {
    return 0;
  }
}

export function RecordWholeWeekModal({
  isOpen,
  onClose,
  onSuccess,
}: RecordWholeWeekModalProps) {
  const { language } = useLanguage();
  // Day of week selection state: 'all' | 'sunday' | 'monday'
  const [dayFilter, setDayFilter] = useState<CollectionDayFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string>(getNearestSunday);
  const [remarks, setRemarks] = useState<string>('');
  const [showGroupsBreakdown, setShowGroupsBreakdown] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch all active groups to allow day-based filtering
  const { data: allGroups = [] } = useGroups({ status: 'Active' });

  const sundayGroups = useMemo(() => {
    return (allGroups || []).filter((g) => getGroupDayOfWeek(g) === 0);
  }, [allGroups]);

  const mondayGroups = useMemo(() => {
    return (allGroups || []).filter((g) => getGroupDayOfWeek(g) === 1);
  }, [allGroups]);

  const filteredGroupIds = useMemo(() => {
    if (dayFilter === 'sunday') return sundayGroups.map((g) => g.id);
    if (dayFilter === 'monday') return mondayGroups.map((g) => g.id);
    return undefined; // All groups
  }, [dayFilter, sundayGroups, mondayGroups]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live preview query based on selected date & filtered group IDs
  const {
    data: preview,
    isLoading: isPreviewLoading,
  } = useRecordWeekPreview(
    isOpen ? { payment_date: selectedDate, group_ids: filteredGroupIds } : undefined
  );

  const { mutateAsync: recordWholeWeek, isPending: isSubmitting } = useRecordWholeWeek();

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setShowGroupsBreakdown(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setErrorMessage(null);
    onClose();
  };

  const handleDayFilterChange = (filter: CollectionDayFilter) => {
    setDayFilter(filter);
    if (filter === 'sunday') {
      setSelectedDate(getNearestSunday());
    } else if (filter === 'monday') {
      setSelectedDate(getNearestMonday());
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setErrorMessage(null);

    if (preview.eligible_members_count === 0) {
      const dayName = dayFilter === 'sunday' ? 'Sunday' : dayFilter === 'monday' ? 'Monday' : 'the week';
      setErrorMessage(
        `All active members for ${dayName} have already paid their installments for Business Week ${preview.business_week}.`
      );
      return;
    }

    try {
      const dayLabel = dayFilter === 'sunday' ? 'Sunday' : dayFilter === 'monday' ? 'Monday' : '';
      const res = await recordWholeWeek({
        payment_date: selectedDate,
        business_week: preview.business_week,
        group_ids: filteredGroupIds,
        remarks:
          remarks.trim() ||
          `Business Week ${preview.business_week}${dayLabel ? ` ${dayLabel}` : ''} bulk recording (${formatDateDisplay(selectedDate)})`,
      });

      onSuccess(res);
      handleClose();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string; detail?: string } };
        message?: string;
      };
      const msg =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Failed to record whole week collections.';
      setErrorMessage(msg);
    }
  };

  if (!isOpen) return null;

  const totalPendingAmountNum = preview ? Number(preview.total_pending_amount) : 0;
  const eligibleCount = preview?.eligible_members_count ?? 0;
  const alreadyPaidCount = preview?.already_paid_count ?? 0;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-secondary-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-week-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
    >
      <div className="relative w-full max-w-xl rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border border-border max-h-[94dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 flex-shrink-0 bg-surface">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-600 flex-shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="record-week-modal-title"
                className="text-base sm:text-lg font-bold text-secondary-900"
              >
                {language === 'ta' ? 'முழு வார வசூல் பதிவு' : 'Record Whole Week Collection'}
              </h2>
              <p className="text-xs text-secondary-500 mt-0.5">
                {language === 'ta'
                  ? 'அனைத்து தகுதியான உறுப்பினர்களுக்கும் ஒரே கிளிக்கில் வசூல் பதிவு'
                  : 'One-click recording for all eligible customers across groups'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center -mr-1"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="rounded-xl bg-error-50 p-3.5 text-sm text-error-700 border border-error-200 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-error-500 mt-0.5" />
              <div className="flex-1 text-xs sm:text-sm">{errorMessage}</div>
            </div>
          )}

          {/* Collection Day Filter Tabs */}
          <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-600">
                {language === 'ta' ? 'வசூல் நாள்' : 'Collection Day'}
              </span>
              <span className="text-xs text-secondary-500 font-medium">
                {dayFilter === 'all'
                  ? (language === 'ta' ? `அனைத்து ${allGroups.length} குழுக்கள்` : `All ${allGroups.length} Active Groups`)
                  : dayFilter === 'sunday'
                  ? (language === 'ta' ? `${sundayGroups.length} ஞாயிறு குழுக்கள்` : `${sundayGroups.length} Sunday Groups`)
                  : (language === 'ta' ? `${mondayGroups.length} திங்கள் குழுக்கள்` : `${mondayGroups.length} Monday Groups`)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDayFilterChange('all')}
                disabled={isSubmitting}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-2 rounded-lg border text-xs font-semibold transition-all',
                  dayFilter === 'all'
                    ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-xs ring-1 ring-primary-500'
                    : 'bg-secondary-50/70 border-border text-secondary-700 hover:bg-secondary-100'
                )}
              >
                <span>{language === 'ta' ? 'அனைத்து குழுக்கள்' : 'All Groups'}</span>
                <span className="text-[11px] font-normal text-secondary-500 mt-0.5">
                  {allGroups.length} {language === 'ta' ? 'குழுக்கள்' : 'groups'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDayFilterChange('sunday')}
                disabled={isSubmitting}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-2 rounded-lg border text-xs font-semibold transition-all',
                  dayFilter === 'sunday'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-secondary-50/70 border-border text-secondary-700 hover:bg-secondary-100'
                )}
              >
                <span>{language === 'ta' ? 'ஞாயிறு' : 'Sunday (ஞாயிறு)'}</span>
                <span className="text-[11px] font-normal text-secondary-500 mt-0.5">
                  {sundayGroups.length} {language === 'ta' ? 'குழுக்கள்' : 'groups'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDayFilterChange('monday')}
                disabled={isSubmitting}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-2 rounded-lg border text-xs font-semibold transition-all',
                  dayFilter === 'monday'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-xs ring-1 ring-indigo-500'
                    : 'bg-secondary-50/70 border-border text-secondary-700 hover:bg-secondary-100'
                )}
              >
                <span>{language === 'ta' ? 'திங்கள்' : 'Monday (திங்கள்)'}</span>
                <span className="text-[11px] font-normal text-secondary-500 mt-0.5">
                  {mondayGroups.length} {language === 'ta' ? 'குழுக்கள்' : 'groups'}
                </span>
              </button>
            </div>

            {dayFilter === 'monday' && mondayGroups.length === 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200">
                Tip: No Monday groups created yet. Upcoming groups configured with Monday start date will automatically appear here for 1-click collection!
              </p>
            )}
          </div>

          {/* Date Picker & Quick Day Chips */}
          <div className="rounded-xl border border-border bg-secondary-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="week-collection-date"
                className="text-xs font-bold uppercase tracking-wider text-secondary-600 flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 text-primary-600" />
                Collection Payment Date
              </label>
              <span className="text-xs text-secondary-500 font-medium">
                {preview ? `Business Week ${preview.business_week}` : 'Calculating week...'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id="week-collection-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />

              {/* Quick Date Switcher Chips */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDayFilterChange('sunday')}
                  className={cn(
                    'px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                    dayFilter === 'sunday' || selectedDate === getNearestSunday()
                      ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                      : 'bg-surface text-secondary-700 border-border hover:bg-secondary-100'
                  )}
                >
                  Sunday
                </button>
                <button
                  type="button"
                  onClick={() => handleDayFilterChange('monday')}
                  className={cn(
                    'px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                    dayFilter === 'monday' || selectedDate === getNearestMonday()
                      ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                      : 'bg-surface text-secondary-700 border-border hover:bg-secondary-100'
                  )}
                >
                  Monday
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(getToday())}
                  className={cn(
                    'px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                    selectedDate === getToday()
                      ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                      : 'bg-surface text-secondary-700 border-border hover:bg-secondary-100'
                  )}
                >
                  Today
                </button>
              </div>
            </div>

            {preview && (
              <p className="text-[11px] text-secondary-500">
                Week Date Range: <span className="font-semibold text-secondary-700">{formatDateDisplay(preview.week_start_date)}</span> to <span className="font-semibold text-secondary-700">{formatDateDisplay(preview.week_end_date)}</span>
              </p>
            )}
          </div>

          {/* Collection Amount & Overview Card */}
          <div className="rounded-2xl border border-primary-200/80 bg-gradient-to-br from-primary-50/70 via-surface to-primary-50/30 p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-100 text-primary-800">
                  <Sparkles className="w-3 h-3 text-primary-600" />
                  Expected Collection
                </span>
                <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">
                  {isPreviewLoading ? (
                    <span className="text-secondary-400 text-xl font-normal">Calculating...</span>
                  ) : (
                    formatCurrency(totalPendingAmountNum)
                  )}
                </div>
                <p className="text-xs text-secondary-600 mt-1">
                  For {eligibleCount} customer installment{eligibleCount === 1 ? '' : 's'} across {preview?.groups?.length || 0} groups
                </p>
              </div>

              {/* Status Pill */}
              <div className="text-right">
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
                    eligibleCount > 0
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-secondary-100 text-secondary-600 border border-secondary-200'
                  )}
                >
                  {eligibleCount > 0 ? `${eligibleCount} Pending` : 'All Recorded'}
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-4 pt-3 border-t border-primary-100 grid grid-cols-3 gap-2 text-center">
              <div className="bg-surface/80 rounded-lg p-2 border border-primary-100/60">
                <div className="text-[10px] font-medium text-secondary-500 uppercase">Active Total</div>
                <div className="text-sm font-bold text-secondary-800">
                  {preview?.total_active_members || 0}
                </div>
              </div>
              <div className="bg-surface/80 rounded-lg p-2 border border-primary-100/60">
                <div className="text-[10px] font-medium text-secondary-500 uppercase">To Record</div>
                <div className="text-sm font-bold text-emerald-600">
                  {eligibleCount}
                </div>
              </div>
              <div className="bg-surface/80 rounded-lg p-2 border border-primary-100/60">
                <div className="text-[10px] font-medium text-secondary-500 uppercase">Already Paid</div>
                <div className="text-sm font-bold text-secondary-600">
                  {alreadyPaidCount}
                </div>
              </div>
            </div>
          </div>

          {/* Remarks input */}
          <div>
            <label
              htmlFor="record-week-remarks"
              className="block text-xs font-bold uppercase tracking-wider text-secondary-600 mb-1"
            >
              Optional Remarks
            </label>
            <input
              id="record-week-remarks"
              type="text"
              placeholder={`e.g. Business Week ${preview?.business_week || ''} payment collection`}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          {/* Collapsible Group Breakdown */}
          {preview?.groups && preview.groups.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setShowGroupsBreakdown(!showGroupsBreakdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-secondary-50/70 hover:bg-secondary-100/70 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-secondary-500" />
                  <span className="text-xs font-semibold text-secondary-800">
                    Group Breakdown ({preview.groups.length} Groups)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-secondary-500">
                  <span>{showGroupsBreakdown ? 'Hide' : 'View Details'}</span>
                  {showGroupsBreakdown ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {showGroupsBreakdown && (
                <div className="max-h-56 overflow-y-auto divide-y divide-border bg-surface p-2">
                  {preview.groups.map((g) => (
                    <div
                      key={g.group_id}
                      className="py-2 px-3 flex items-center justify-between text-xs hover:bg-secondary-50/60 rounded-lg transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-secondary-900 truncate">
                          {g.group_name}
                        </p>
                        <p className="text-[11px] text-secondary-500">
                          {g.location ? `${g.location} · ` : ''}
                          {g.pending_members} / {g.active_members} members pending
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-secondary-900">
                          {formatCurrency(Number(g.pending_amount))}
                        </p>
                        <p className="text-[10px] text-secondary-500">
                          @ ₹{Number(g.weekly_installment)}/wk
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Safety Notice */}
          <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 flex items-start gap-2.5 text-xs text-amber-800">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              Each customer's payment advances their sequential installment week automatically.
              Customers who already paid for this business week will be safely skipped.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-surface flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4"
          >
            {language === 'ta' ? 'ரத்து' : 'Cancel'}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            disabled={isPreviewLoading || eligibleCount === 0}
            className="min-h-[44px] flex-1 sm:flex-initial px-6 font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
            leftIcon={<Zap className="w-4 h-4" />}
          >
            {isSubmitting
              ? (language === 'ta' ? 'பதிவு செய்கிறது...' : 'Recording...')
              : eligibleCount === 0
              ? (language === 'ta' ? 'அனைத்தும் ஏற்கனவே பதிவு செய்யப்பட்டன' : 'All Already Recorded')
              : dayFilter === 'sunday'
              ? (language === 'ta' ? `ஞாயிறு வசூலை பதிவு செய் (${formatCurrency(totalPendingAmountNum)})` : `Record Sunday Collections (${formatCurrency(totalPendingAmountNum)})`)
              : dayFilter === 'monday'
              ? (language === 'ta' ? `திங்கள் வசூலை பதிவு செய் (${formatCurrency(totalPendingAmountNum)})` : `Record Monday Collections (${formatCurrency(totalPendingAmountNum)})`)
              : (language === 'ta' ? `முழு வார வசூலை பதிவு செய் (${formatCurrency(totalPendingAmountNum)})` : `Record Week Collections (${formatCurrency(totalPendingAmountNum)})`)}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
