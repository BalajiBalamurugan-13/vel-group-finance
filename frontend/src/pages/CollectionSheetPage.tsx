import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Printer,
  Calendar,
  Sun,
  Moon,
  Settings2,
  RefreshCw,
  Users,
  Layers,
  MapPin,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useGroups, type Group } from '@/features/groups';
import { useMembers, type Member } from '@/features/members';
import {
  usePlacesRoute,
  buildPlaceLookupMap,
  resolvePlaceRouteInfo,
} from '@/features/places';
import { useLanguage } from '@/i18n';
import { useDocumentTitle } from '@/hooks';
import { ROUTES } from '@/constants';
import { formatCurrency } from '@/utils';

// ── Helpers & Constants ────────────────────────────────────────────────────────

export interface DayOption {
  dayNum: number;
  nameTa: string;
  nameEn: string;
}

export const DAYS_OF_WEEK: DayOption[] = [
  { dayNum: 0, nameTa: 'ஞாயிறு', nameEn: 'Sunday' },
  { dayNum: 1, nameTa: 'திங்கள்', nameEn: 'Monday' },
  { dayNum: 2, nameTa: 'செவ்வாய்', nameEn: 'Tuesday' },
  { dayNum: 3, nameTa: 'புதன்', nameEn: 'Wednesday' },
  { dayNum: 4, nameTa: 'வியாழன்', nameEn: 'Thursday' },
  { dayNum: 5, nameTa: 'வெள்ளி', nameEn: 'Friday' },
  { dayNum: 6, nameTa: 'சனி', nameEn: 'Saturday' },
];

function getNextDateForDay(targetDay: number): string {
  const d = new Date();
  const currentDay = d.getDay();
  const diff = (targetDay - currentDay + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function getGroupDayOfWeek(group: Group): number {
  if (!group.start_date) return 0; // Default to Sunday (0) for historical groups
  try {
    const [y, m, d] = group.start_date.split('-').map(Number);
    if (!y || !m || !d) return 0;
    return new Date(y, m - 1, d).getDay();
  } catch {
    return 0;
  }
}

function getDayOfWeekFromDate(isoDate: string): number {
  if (!isoDate) return 0;
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  } catch {
    return 0;
  }
}

function getDayName(dayNum: number, lang: 'en' | 'ta'): string {
  const item = DAYS_OF_WEEK.find((d) => d.dayNum === dayNum);
  if (!item) return '';
  return lang === 'ta' ? `${item.nameTa} (${item.nameEn})` : `${item.nameEn} (${item.nameTa})`;
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

function formatAmount(val: number | string | null | undefined): string {
  if (val == null) return '760';
  const n = Number(val);
  return isNaN(n) ? String(val) : Math.round(n).toString();
}

interface StreamItem {
  group: Group;
  members: Member[];
  groupIndex: number;
  session: 'morning' | 'evening';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CollectionSheetPage() {
  useDocumentTitle('Collection Sheet');
  const { t, language } = useLanguage();

  // Day filter: 0 = Sunday (default for current 33 groups), 1 = Monday, 2 = Tuesday, etc., or -1 = All Days
  const [dayFilter, setDayFilter] = useState<number | -1>(0);
  const [targetDate, setTargetDate] = useState<string>(() => getNextDateForDay(0));
  const [sessionFilter, setSessionFilter] = useState<'all' | 'morning' | 'evening'>('all');

  const { data: groups = [], isLoading: isGroupsLoading, refetch: refetchGroups } = useGroups({
    status: 'Active',
  });
  const { data: members = [], isLoading: isMembersLoading, refetch: refetchMembers } = useMembers({
    status: 'Active',
  });
  const { places, isGroupsLoading: isPlacesLoading } = usePlacesRoute();

  // Create place lookup map for session & sequence order
  const placeLookup = useMemo(() => {
    return buildPlaceLookupMap(places);
  }, [places]);

  // Group members by group_id
  const membersByGroupId = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const m of members) {
      if (!m.group_id) continue;
      const list = map.get(m.group_id) || [];
      list.push(m);
      map.set(m.group_id, list);
    }
    return map;
  }, [members]);

  // Calculate total groups per weekday
  const groupCountsByDay = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const g of groups) {
      const d = getGroupDayOfWeek(g);
      counts[d] = (counts[d] || 0) + 1;
    }
    return counts;
  }, [groups]);

  // Handle day tab click: sets dayFilter and auto-syncs targetDate to upcoming day
  const handleSelectDay = (dayNum: number | -1) => {
    setDayFilter(dayNum);
    if (dayNum !== -1) {
      setTargetDate(getNextDateForDay(dayNum));
    }
  };

  // Handle manual date picker change: auto-syncs dayFilter to selected date's weekday
  const handleDateChange = (newDate: string) => {
    setTargetDate(newDate);
    if (newDate) {
      const day = getDayOfWeekFromDate(newDate);
      setDayFilter(day);
    }
  };

  // Filter groups by collection day
  const dayFilteredGroups = useMemo(() => {
    if (dayFilter === -1) return groups;
    return groups.filter((g) => getGroupDayOfWeek(g) === dayFilter);
  }, [groups, dayFilter]);

  // Categorize and sort groups into Morning and Evening according to Places & Route order
  const { morningGroups, eveningGroups } = useMemo(() => {
    const morning: Group[] = [];
    const evening: Group[] = [];

    dayFilteredGroups.forEach((g) => {
      const place = resolvePlaceRouteInfo(g.location, g.group_name, placeLookup, places);
      const session = place.session || 'morning';
      if (session === 'morning') {
        morning.push(g);
      } else {
        evening.push(g);
      }
    });

    const sortFn = (a: Group, b: Group) => {
      const placeA = resolvePlaceRouteInfo(a.location, a.group_name, placeLookup, places);
      const placeB = resolvePlaceRouteInfo(b.location, b.group_name, placeLookup, places);
      const orderA = placeA.order ?? 999;
      const orderB = placeB.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.group_code || a.group_name).localeCompare(b.group_code || b.group_name, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    };

    morning.sort(sortFn);
    evening.sort(sortFn);

    return { morningGroups: morning, eveningGroups: evening };
  }, [dayFilteredGroups, placeLookup, places]);

  // Filter based on active session selector
  const activeGroups = useMemo(() => {
    if (sessionFilter === 'morning') return morningGroups;
    if (sessionFilter === 'evening') return eveningGroups;
    return [...morningGroups, ...eveningGroups];
  }, [sessionFilter, morningGroups, eveningGroups]);

  // Count active members in the active groups
  const activeMembersCount = useMemo(() => {
    return activeGroups.reduce((acc, g) => acc + (g.member_count || 5), 0);
  }, [activeGroups]);

  // Total weekly target amount for active groups
  const activeTotalTarget = useMemo(() => {
    return activeGroups.reduce((acc, g) => {
      const gMembers = membersByGroupId.get(g.id) || [];
      const installment = g.weekly_installment || g.scheme?.weekly_installment || 760;
      const count = g.member_count || gMembers.length || 5;
      return acc + count * installment;
    }, 0);
  }, [activeGroups, membersByGroupId]);

  // Build paginated discrete pages for A4 Landscape with optimal balanced distribution (Ink-saving, No solid black lines)
  const pages: StreamItem[][] = useMemo(() => {
    const chunkSessionGroups = (
      session: 'morning' | 'evening',
      sessionGroups: Group[],
      startOffsetIndex: number = 0,
    ): StreamItem[][] => {
      if (sessionGroups.length === 0) return [];

      const sessionStream: StreamItem[] = sessionGroups.map((g, idx) => ({
        group: g,
        members: membersByGroupId.get(g.id) || [],
        groupIndex: startOffsetIndex + idx + 1,
        session,
      }));

      // Up to 9 groups per A4 landscape page creates clean balanced collection sheets (Morning 2 pages, Evening 2 pages for 33 groups)
      const MAX_GROUPS_PER_PAGE = 9;
      const totalItems = sessionStream.length;
      const numPages = Math.ceil(totalItems / MAX_GROUPS_PER_PAGE);
      const itemsPerPage = Math.ceil(totalItems / numPages);

      const sessionPages: StreamItem[][] = [];
      let startIdx = 0;
      for (let p = 0; p < numPages; p++) {
        const endIdx = p === numPages - 1 ? totalItems : Math.min(startIdx + itemsPerPage, totalItems);
        sessionPages.push(sessionStream.slice(startIdx, endIdx));
        startIdx = endIdx;
      }
      return sessionPages;
    };

    if (sessionFilter === 'morning') {
      return chunkSessionGroups('morning', morningGroups, 0);
    }
    if (sessionFilter === 'evening') {
      return chunkSessionGroups('evening', eveningGroups, 0);
    }

    // All sessions: Morning pages followed cleanly by Evening pages
    const morningPages = chunkSessionGroups('morning', morningGroups, 0);
    const eveningPages = chunkSessionGroups('evening', eveningGroups, morningGroups.length);
    return [...morningPages, ...eveningPages];
  }, [sessionFilter, morningGroups, eveningGroups, membersByGroupId]);

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    refetchGroups();
    refetchMembers();
  };

  const isLoading = isGroupsLoading || isMembersLoading || isPlacesLoading;

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState fullPage label={language === 'ta' ? 'வசூல் பட்டியல் ஏற்றப்படுகிறது...' : 'Loading collection sheet...'} />
      </PageContainer>
    );
  }

  const targetDayNum = getDayOfWeekFromDate(targetDate);
  const targetDayLabel = getDayName(targetDayNum, language);

  return (
    <>
      {/* ── SCREEN UI (Centered Control Panel) ── */}
      <PageContainer>
        <div className="no-print max-w-2xl mx-auto py-4 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">
                {t('sheet.title')}
              </h1>
              <p className="text-sm text-secondary-500">
                {t('sheet.subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="flex items-center gap-1.5 text-secondary-600"
                title="Refresh Data"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{language === 'ta' ? 'புதுப்பி' : 'Refresh'}</span>
              </Button>

              <Link to={ROUTES.PLACES}>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 text-secondary-700"
                >
                  <Settings2 className="w-4 h-4" />
                  <span>{t('places.title')}</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Configuration Card */}
          <Card className="p-6 bg-surface border border-border shadow-sm space-y-5">
            {/* 1. Day of the Week Selector (Sunday / Monday / Tuesday) */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-secondary-700 mb-2">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-600" />
                  <span>{language === 'ta' ? 'வசூல் நாள் (வடிகட்டி)' : 'Collection Day'}</span>
                </span>
                <span className="text-xs text-secondary-500 font-normal">
                  {language === 'ta' ? 'சுமை குறைக்க நாள் வாரியாக அச்சிடுக' : 'Filter by collection day'}
                </span>
              </label>

              {/* Main Days: Sunday, Monday, Tuesday, All */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                {/* Sunday */}
                <button
                  type="button"
                  onClick={() => handleSelectDay(0)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                    dayFilter === 0
                      ? 'bg-primary-600 text-white border-primary-700 shadow-xs'
                      : 'bg-secondary-50 text-secondary-700 border-secondary-200 hover:bg-secondary-100'
                  }`}
                >
                  <span className="font-bold">{language === 'ta' ? 'ஞாயிறு' : 'Sunday'}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    dayFilter === 0 ? 'bg-primary-800 text-primary-100' : 'bg-secondary-200 text-secondary-700'
                  }`}>
                    {groupCountsByDay[0]} {language === 'ta' ? 'குழு' : 'grp'}
                  </span>
                </button>

                {/* Monday */}
                <button
                  type="button"
                  onClick={() => handleSelectDay(1)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                    dayFilter === 1
                      ? 'bg-primary-600 text-white border-primary-700 shadow-xs'
                      : 'bg-secondary-50 text-secondary-700 border-secondary-200 hover:bg-secondary-100'
                  }`}
                >
                  <span className="font-bold">{language === 'ta' ? 'திங்கள்' : 'Monday'}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    dayFilter === 1 ? 'bg-primary-800 text-primary-100' : 'bg-secondary-200 text-secondary-700'
                  }`}>
                    {groupCountsByDay[1]} {language === 'ta' ? 'குழு' : 'grp'}
                  </span>
                </button>

                {/* Tuesday */}
                <button
                  type="button"
                  onClick={() => handleSelectDay(2)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                    dayFilter === 2
                      ? 'bg-primary-600 text-white border-primary-700 shadow-xs'
                      : 'bg-secondary-50 text-secondary-700 border-secondary-200 hover:bg-secondary-100'
                  }`}
                >
                  <span className="font-bold">{language === 'ta' ? 'செவ்வாய்' : 'Tuesday'}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    dayFilter === 2 ? 'bg-primary-800 text-primary-100' : 'bg-secondary-200 text-secondary-700'
                  }`}>
                    {groupCountsByDay[2]} {language === 'ta' ? 'குழு' : 'grp'}
                  </span>
                </button>

                {/* All Days */}
                <button
                  type="button"
                  onClick={() => handleSelectDay(-1)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center flex flex-col items-center gap-0.5 ${
                    dayFilter === -1
                      ? 'bg-secondary-800 text-white border-secondary-900 shadow-xs'
                      : 'bg-secondary-50 text-secondary-700 border-secondary-200 hover:bg-secondary-100'
                  }`}
                >
                  <span className="font-bold">{language === 'ta' ? 'அனைத்தும்' : 'All Days'}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    dayFilter === -1 ? 'bg-secondary-950 text-secondary-200' : 'bg-secondary-200 text-secondary-700'
                  }`}>
                    {groups.length} {language === 'ta' ? 'குழு' : 'grp'}
                  </span>
                </button>
              </div>

              {/* Other days pills (Wednesday - Saturday) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-secondary-400 text-[11px] mr-1">
                  {language === 'ta' ? 'பிற நாட்கள்:' : 'Other days:'}
                </span>
                {[3, 4, 5, 6].map((dayNum) => {
                  const day = DAYS_OF_WEEK.find((d) => d.dayNum === dayNum)!;
                  const isSelected = dayFilter === dayNum;
                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleSelectDay(dayNum)}
                      className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                        isSelected
                          ? 'bg-primary-600 text-white border-primary-700 font-bold'
                          : 'bg-surface text-secondary-600 border-secondary-200 hover:bg-secondary-50'
                      }`}
                    >
                      {language === 'ta' ? day.nameTa : day.nameEn} ({groupCountsByDay[dayNum]})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Target Date Input */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-secondary-700 mb-2">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-600" />
                  <span>{t('sheet.targetDate')}</span>
                </span>
                <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                  {targetDayLabel}
                </span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-secondary-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-medium"
              />
            </div>

            {/* 3. Session Selector */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-secondary-700 mb-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>{t('places.session')}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSessionFilter('all')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                    sessionFilter === 'all'
                      ? 'bg-secondary-800 text-white border-secondary-800 shadow-xs'
                      : 'bg-secondary-50 text-secondary-600 border-secondary-200 hover:bg-secondary-100'
                  }`}
                >
                  {t('sheet.allSessions')}
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('morning')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center flex items-center justify-center gap-1.5 ${
                    sessionFilter === 'morning'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs font-bold'
                      : 'bg-amber-50/50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>{t('places.morning')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('evening')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center flex items-center justify-center gap-1.5 ${
                    sessionFilter === 'evening'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs font-bold'
                      : 'bg-indigo-50/50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>{t('places.evening')}</span>
                </button>
              </div>
            </div>

            {/* Empty State Warning if Selected Day Has 0 Groups */}
            {activeGroups.length === 0 && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    {language === 'ta'
                      ? `தேர்ந்தெடுத்த நாளில் (${targetDayLabel}) செயலில் உள்ள குழுக்கள் இல்லை`
                      : `No active groups scheduled for ${targetDayLabel}`}
                  </div>
                  <div className="mt-0.5 text-amber-800">
                    {language === 'ta'
                      ? 'குழுக்கள் பக்கத்தில் புதிய குழுவை உருவாக்கும் போது தொடக்க தேதியை இந்த நாளாக தேர்வு செய்யவும்.'
                      : 'When creating or updating groups, assign their start date to this day to include them.'}
                  </div>
                </div>
              </div>
            )}

            {/* Status Information Counters */}
            <div className="p-4 bg-secondary-50 rounded-xl border border-secondary-200/80 space-y-2 text-sm text-secondary-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-secondary-500" />
                  <span>{t('sheet.totalGroups')}</span>
                </span>
                <span className="font-bold text-secondary-900">{activeGroups.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-secondary-500" />
                  <span>{t('sheet.totalMembers')}</span>
                </span>
                <span className="font-bold text-secondary-900">{activeMembersCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-secondary-500" />
                  <span>{t('sheet.totalTarget')}</span>
                </span>
                <span className="font-bold text-secondary-900">{formatCurrency(activeTotalTarget)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-secondary-500" />
                  <span>{t('places.totalRoute')}</span>
                </span>
                <span className="font-bold text-secondary-900">{places.length}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-secondary-200">
                <span className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-secondary-800">
                    {language === 'ta' ? 'அச்சு பக்கங்கள் (A4 Landscape)' : 'Printable Sheets (A4 Landscape)'}
                  </span>
                </span>
                <span className="font-bold text-emerald-700">
                  {pages.length} {language === 'ta' ? 'பக்கங்கள்' : 'Sheets'}
                </span>
              </div>
            </div>

            {/* Big Green Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={activeGroups.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:bg-secondary-300 disabled:cursor-not-allowed rounded-xl py-3.5 text-base font-bold text-white shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              <span>{t('sheet.printPdf')}</span>
            </button>
          </Card>
        </div>
      </PageContainer>

      {/* ── PRINT DOCUMENT (Rendered in React Portal, Hidden on Screen, Ink-Optimized) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="print-document">
            {pages.map((pageItems, pageIdx) => {
              const firstItem = pageItems[0];
              const isPageMorning = firstItem?.session === 'morning';
              const isPageEvening = firstItem?.session === 'evening';

              return (
                <div key={pageIdx} className="print-page p-1 h-[198mm] max-h-[198mm] flex flex-col justify-between">
                  {/* ── Page Header (Repeated on Every Physical Page, Thin Border, Zero Ink Waste) ── */}
                  <div className="flex items-baseline justify-between border-b-2 border-black pb-0.5 mb-1 leading-none shrink-0 print-elder-bold">
                    <div className="text-sm font-black tracking-wide text-black uppercase print-elder-bold">
                      VEL FINANCE
                      {isPageMorning && ' — காலை வசூல் (MORNING)'}
                      {isPageEvening && ' — மாலை வசூல் (EVENING)'}
                    </div>
                    <div className="text-xs font-black text-black tracking-wider print-elder-bold">
                      {targetDayLabel} — {formatDateDisplay(targetDate)}
                    </div>
                    <div className="text-xs font-black text-black border border-black bg-white px-2 py-0.5 rounded-sm print-elder-bold">
                      {language === 'ta' ? `பக்கம் ${pageIdx + 1} / ${pages.length}` : `PAGE ${pageIdx + 1} OF ${pages.length}`}
                    </div>
                  </div>

                  {/* ── Page Content: Groups stretch evenly to fill 100% of page height (Zero blank space) ── */}
                  <div className="flex-1 min-h-0 flex flex-col justify-between gap-1">
                    {pageItems.map((item) => {
                      const group = item.group;
                      const groupMembers = item.members || [];
                      const weeklyInstallment = group.weekly_installment || group.scheme?.weekly_installment || 760;
                      const groupTarget = (group.member_count || groupMembers.length || 5) * weeklyInstallment;

                      return (
                        <div
                          key={group.id}
                          className="print-avoid-break flex-1 min-h-0 border-2 border-black rounded-sm bg-white text-black py-0.5 px-1.5 flex items-stretch gap-1.5 leading-tight"
                        >
                          {/* ── Left Column: Group Name Only (~13% width, Location Removed per Req 2) ── */}
                          <div className="w-[13%] shrink-0 border-r-2 border-black pr-1.5 flex flex-col justify-center">
                            <div className="font-black text-[12px] text-black leading-tight line-clamp-2 print-elder-bold">
                              #{item.groupIndex}. {group.group_name}
                            </div>
                          </div>

                          {/* ── Center Column: Dynamic Member Columns (~74% width) ── */}
                          <div className="w-[74%] flex flex-row gap-1 items-stretch">
                            {groupMembers.length === 0 ? (
                              <div className="flex-1 flex items-center justify-center text-gray-400 font-bold text-[10px] italic border-2 border-dashed border-gray-300">
                                <span>காலி</span>
                              </div>
                            ) : (
                              groupMembers.map((member, slotIdx) => {
                                const isLargeGroup = groupMembers.length >= 7;
                                const isMediumGroup = groupMembers.length === 6;
                                const nameTextSize = isLargeGroup ? 'text-[10px]' : isMediumGroup ? 'text-[11px]' : 'text-[11.5px]';
                                const amountTextSize = isLargeGroup ? 'text-[10px]' : 'text-[11px]';
                                const weekNum = (member.weeks_paid ?? 0) + 1;
                                const weekBadgeText = isLargeGroup
                                  ? (language === 'ta' ? `வா${weekNum}` : `W${weekNum}`)
                                  : (language === 'ta' ? `வாரம் ${weekNum}` : `Week ${weekNum}`);

                                return (
                                  <div
                                    key={member.id || `member-${slotIdx}`}
                                    className="flex-1 min-w-0 border-2 border-black rounded-sm px-1 py-0.5 flex flex-col justify-between bg-white overflow-hidden"
                                  >
                                    <div
                                      className={`font-black ${nameTextSize} leading-[1.15] text-black break-words print-elder-bold`}
                                      style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                      }}
                                      title={member.member_name}
                                    >
                                      {slotIdx + 1}. {member.member_name}
                                    </div>
                                    <div className="mt-auto pt-0.5 flex items-center justify-between border-t border-black shrink-0">
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className="w-3.5 h-3.5 border-2 border-black inline-block rounded-xs bg-white shrink-0" />
                                        <span className={`font-black ${amountTextSize} text-black shrink-0 print-elder-bold`}>
                                          ₹{formatAmount(member.weekly_installment || weeklyInstallment)}
                                        </span>
                                      </div>
                                      {member.weeks_paid !== undefined && (
                                        <span className="text-[10.5px] font-black text-black bg-gray-100 border-1.5 border-black px-1.5 py-0.2 rounded-xs shrink-0 print-elder-bold">
                                          {weekBadgeText}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* ── Right Column: Group Total Target Amount (~13% width, Replaces Sign/Amt per Req 2) ── */}
                          <div className="w-[13%] shrink-0 border-l-2 border-black pl-1.5 flex flex-col justify-center items-center text-center">
                            <span className="text-[9px] font-black text-black uppercase tracking-wider print-elder-bold">
                              மொத்த இலக்கு
                            </span>
                            <span className="text-[13.5px] font-black text-black print-elder-bold tracking-tight mt-0.5">
                              {formatCurrency(groupTarget)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Page Footer on the Final Page (White background to save toner) ── */}
                  {pageIdx === pages.length - 1 && (
                    <div className="print-avoid-break mt-1 pt-1 border-t-2 border-black shrink-0">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold border-2 border-black p-1 bg-white text-black">
                        <div>
                          <span className="text-[10px] font-bold text-black block print-elder-bold">மொத்த குழுக்கள்</span>
                          <span className="text-sm font-black text-black print-elder-bold">{activeGroups.length}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-black block print-elder-bold">உண்மையான வசூல் தொகை</span>
                          <span className="text-sm font-black text-black print-elder-bold">₹ ______________</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-black block print-elder-bold">வசூலிப்பாளர் / மேலாளர் கையொப்பம்</span>
                          <span className="text-sm font-black text-black print-elder-bold">___________________</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
