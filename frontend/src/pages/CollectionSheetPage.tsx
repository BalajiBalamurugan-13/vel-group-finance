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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNextOrCurrentSunday(): string {
  const d = new Date();
  const day = d.getDay(); // 0 is Sunday
  const diff = (7 - day) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
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
  type: 'session-header' | 'group';
  session?: 'morning' | 'evening';
  groupCount?: number;
  group?: Group;
  members?: Member[];
  groupIndex?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CollectionSheetPage() {
  useDocumentTitle('Sunday Collection Sheet');
  const { t, language } = useLanguage();

  const [targetDate, setTargetDate] = useState<string>(getNextOrCurrentSunday);
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

  // Categorize and sort groups into Morning and Evening
  const { morningGroups, eveningGroups } = useMemo(() => {
    const morning: Group[] = [];
    const evening: Group[] = [];

    groups.forEach((g) => {
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
  }, [groups, placeLookup, places]);

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

  // Build paginated discrete pages for A4 Landscape with optimal balanced distribution (eliminates all blank bottom space and collisions)
  const pages: StreamItem[][] = useMemo(() => {
    const chunkSessionGroups = (
      session: 'morning' | 'evening',
      sessionGroups: Group[],
    ): StreamItem[][] => {
      if (sessionGroups.length === 0) return [];

      const sessionStream: StreamItem[] = [];
      sessionStream.push({
        type: 'session-header',
        session,
        groupCount: sessionGroups.length,
      });
      sessionGroups.forEach((g, idx) => {
        sessionStream.push({
          type: 'group',
          group: g,
          members: membersByGroupId.get(g.id) || [],
          groupIndex: idx + 1,
          session,
        });
      });

      // Standard 10 items per page creates clean 4-page collection sheets (Morning 2 pages, Evening 2 pages)
      const MAX_ITEMS = 10;
      const totalItems = sessionStream.length;
      const numPages = Math.ceil(totalItems / MAX_ITEMS);
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
      return chunkSessionGroups('morning', morningGroups);
    }
    if (sessionFilter === 'evening') {
      return chunkSessionGroups('evening', eveningGroups);
    }

    // All sessions: Morning pages followed cleanly by Evening pages
    const morningPages = chunkSessionGroups('morning', morningGroups);
    const eveningPages = chunkSessionGroups('evening', eveningGroups);
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
            {/* Date Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-secondary-700 mb-2">
                <Calendar className="w-4 h-4 text-primary-600" />
                <span>{t('sheet.targetDate')}</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-secondary-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-medium"
              />
            </div>

            {/* Session Selector */}
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
                  <MapPin className="w-4 h-4 text-secondary-500" />
                  <span>{t('places.totalRoute')}</span>
                </span>
                <span className="font-bold text-secondary-900">{places.length}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-secondary-200">
                <span className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-secondary-800">
                    {language === 'ta' ? 'அச்சு பக்கங்கள் (A4 Landscape — கச்சிதமான 4 பக்கங்கள்)' : 'Printable Sheets (A4 Landscape — 4 Balanced Sheets)'}
                  </span>
                </span>
                <span className="font-bold text-emerald-700">{pages.length}</span>
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

      {/* ── PRINT DOCUMENT (Rendered in React Portal, Hidden on Screen) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="print-document">
            {pages.map((pageItems, pageIdx) => (
              <div key={pageIdx} className="print-page p-1 h-[198mm] max-h-[198mm] flex flex-col justify-between">
                {/* ── Page Header (Repeated on Every Physical Page) ── */}
                <div className="flex items-baseline justify-between border-b-4 border-black pb-0.5 mb-1 leading-none shrink-0 print-elder-bold">
                  <div className="text-base font-black tracking-wide text-black uppercase print-elder-bold">
                    VEL FINANCE
                    {sessionFilter === 'morning' && ' — காலை வசூல் (MORNING)'}
                    {sessionFilter === 'evening' && ' — மாலை வசூல் (EVENING)'}
                  </div>
                  <div className="text-sm font-black text-black tracking-wider print-elder-bold">
                    {formatDateDisplay(targetDate)}
                  </div>
                  <div className="text-xs font-black text-white bg-black px-2 py-0.5 rounded-sm">
                    PAGE {pageIdx + 1} OF {pages.length}
                  </div>
                </div>

                {/* ── Page Content: Groups stretch evenly to fill 100% of page height (Zero blank space) ── */}
                <div className="flex-1 min-h-0 flex flex-col justify-between gap-1">
                  {pageItems.map((item, itemIdx) => {
                    if (item.type === 'session-header') {
                      const isMorn = item.session === 'morning';
                      return (
                        <div
                          key={`sess-${itemIdx}`}
                          className="bg-black text-white font-black text-[11px] px-2.5 py-1 rounded-sm flex items-center justify-between uppercase tracking-wider shrink-0 print-elder-bold"
                        >
                          <div className="flex items-center gap-2">
                            <span>{isMorn ? '☀️' : '🌙'}</span>
                            <span>
                              {isMorn
                                ? `காலை வசூல் (MORNING SESSION) — ${item.groupCount} குழுக்கள்`
                                : `மாலை வசூல் (EVENING SESSION) — ${item.groupCount} குழுக்கள்`}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    const group = item.group!;
                    const groupMembers = item.members || [];
                    const weeklyInstallment = group.scheme?.weekly_installment || 760;
                    const groupTarget = (group.member_count || groupMembers.length || 5) * weeklyInstallment;

                    return (
                      <div
                        key={group.id}
                        className="print-avoid-break flex-1 min-h-0 border-2 border-black rounded-sm bg-white text-black py-0.5 px-1.5 flex items-stretch gap-1.5 leading-tight"
                      >
                        {/* ── Left Column: Group & Place Info (~14% width) ── */}
                        <div className="w-[14%] shrink-0 border-r-2 border-black pr-1.5 flex flex-col justify-between">
                          <div>
                            <div className="font-black text-[11.5px] text-black leading-tight line-clamp-2 print-elder-bold">
                              #{item.groupIndex}. {group.group_name}
                            </div>
                            <div className="text-[10px] text-black font-extrabold mt-0.5 truncate">
                              {group.location}
                            </div>
                          </div>
                          <div className="mt-auto text-[10px] flex items-center justify-between border-t border-black pt-0.5 shrink-0">
                            <span className="font-extrabold text-black print-elder-bold">இலக்கு:</span>
                            <span className="font-black text-[11px] text-black print-elder-bold">
                              {formatCurrency(groupTarget)}
                            </span>
                          </div>
                        </div>

                        {/* ── Center Column: Dynamic Member Columns (~74% width: generous space for 7 members) ── */}
                        <div className="w-[74%] flex flex-row gap-1 items-stretch">
                          {groupMembers.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-gray-400 font-bold text-[10px] italic border-2 border-dashed border-gray-300">
                              <span>காலி</span>
                            </div>
                          ) : (
                            groupMembers.map((member, slotIdx) => {
                              const isLargeGroup = groupMembers.length >= 7;
                              const isMediumGroup = groupMembers.length === 6;
                              const nameTextSize = isLargeGroup ? 'text-[10.5px]' : isMediumGroup ? 'text-[11px]' : 'text-[11.5px]';
                              const amountTextSize = isLargeGroup ? 'text-[10.5px]' : 'text-[11px]';
                              const badgeTextSize = isLargeGroup ? 'text-[8.5px]' : 'text-[9px]';

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
                                      <span className={`${badgeTextSize} font-black text-black bg-gray-200 border border-black px-1 rounded-xs shrink-0`}>
                                        W{member.weeks_paid + 1}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* ── Right Column: Collector Sign Box (~12% width) ── */}
                        <div className="w-[12%] shrink-0 border-l-2 border-black pl-1.5 flex flex-col justify-between text-[10px]">
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-black print-elder-bold">வசூல்:</span>
                              <span className="font-black text-black text-[11px] print-elder-bold">₹ ______</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-black text-black print-elder-bold">ஒப்பம்:</span>
                              <span className="font-bold text-black print-elder-bold">________</span>
                            </div>
                          </div>
                          <div className="text-right text-[9.5px] font-black text-black uppercase mt-auto shrink-0 print-elder-bold">
                            {item.session === 'morning' ? 'காலை' : 'மாலை'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Page Footer on the Final Page ── */}
                {pageIdx === pages.length - 1 && (
                  <div className="print-avoid-break mt-1 pt-1 border-t-4 border-black shrink-0">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold border-2 border-black p-1 bg-gray-100 text-black">
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
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
