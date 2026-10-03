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

/** 10 groups fit comfortably on one A4 Landscape sheet */
const GROUPS_PER_PAGE = 10;

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

  // Build paginated discrete pages for A4 Landscape
  const pages: StreamItem[][] = useMemo(() => {
    const stream: StreamItem[] = [];

    if (sessionFilter === 'all') {
      if (morningGroups.length > 0) {
        stream.push({
          type: 'session-header',
          session: 'morning',
          groupCount: morningGroups.length,
        });
        morningGroups.forEach((g, idx) => {
          stream.push({
            type: 'group',
            group: g,
            members: membersByGroupId.get(g.id) || [],
            groupIndex: idx + 1,
            session: 'morning',
          });
        });
      }
      if (eveningGroups.length > 0) {
        stream.push({
          type: 'session-header',
          session: 'evening',
          groupCount: eveningGroups.length,
        });
        eveningGroups.forEach((g, idx) => {
          stream.push({
            type: 'group',
            group: g,
            members: membersByGroupId.get(g.id) || [],
            groupIndex: idx + 1,
            session: 'evening',
          });
        });
      }
    } else if (sessionFilter === 'morning') {
      stream.push({
        type: 'session-header',
        session: 'morning',
        groupCount: morningGroups.length,
      });
      morningGroups.forEach((g, idx) => {
        stream.push({
          type: 'group',
          group: g,
          members: membersByGroupId.get(g.id) || [],
          groupIndex: idx + 1,
          session: 'morning',
        });
      });
    } else {
      stream.push({
        type: 'session-header',
        session: 'evening',
        groupCount: eveningGroups.length,
      });
      eveningGroups.forEach((g, idx) => {
        stream.push({
          type: 'group',
          group: g,
          members: membersByGroupId.get(g.id) || [],
          groupIndex: idx + 1,
          session: 'evening',
        });
      });
    }

    // Chunk stream into physical pages
    const result: StreamItem[][] = [];
    let currentPage: StreamItem[] = [];
    let currentSlots = 0;

    for (const item of stream) {
      const weight = item.type === 'session-header' ? 1 : 1;
      if (currentSlots + weight > GROUPS_PER_PAGE) {
        result.push(currentPage);
        currentPage = [];
        currentSlots = 0;
      }
      currentPage.push(item);
      currentSlots += weight;
    }
    if (currentPage.length > 0) {
      result.push(currentPage);
    }
    return result;
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
      {/* ── SCREEN UI (Centered Control Panel Only — Matching DL Project) ── */}
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
          <Card className="p-6 bg-surface border border-border shadow-sm space-y-6">
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
                    {language === 'ta' ? 'அச்சு பக்கங்கள் (A4 Landscape)' : 'Printable Sheets (A4 Landscape)'}
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
              <div key={pageIdx} className="print-page p-3">
                {/* ── Clean Single-Line Header (NO Aggregate Amounts at Top) ── */}
                <div className="flex items-baseline justify-between border-b-2 border-black pb-1 mb-2 leading-none">
                  <div className="text-base font-black tracking-wide text-black uppercase">
                    VEL FINANCE
                    {sessionFilter === 'morning' && ' (MORNING)'}
                    {sessionFilter === 'evening' && ' (EVENING)'}
                  </div>
                  <div className="text-sm font-black text-black tracking-wider">
                    {formatDateDisplay(targetDate)}
                  </div>
                  <div className="text-xs font-black text-black">
                    PAGE {pageIdx + 1} OF {pages.length}
                  </div>
                </div>

                {/* ── Page Content (Session Headers & Groups) ── */}
                <div className="space-y-1">
                  {pageItems.map((item, itemIdx) => {
                    if (item.type === 'session-header') {
                      const isMorn = item.session === 'morning';
                      return (
                        <div
                          key={`sess-${itemIdx}`}
                          className="bg-gray-100 border border-black text-black font-black text-[11px] px-2 py-0.5 rounded-2xs flex items-center justify-between uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{isMorn ? '🌅' : '🌇'}</span>
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

                    // Dynamic Member Slots (Supports 5, 6, 7 or more members dynamically)
                    const totalSlots = Math.max(5, group.member_count || 0, groupMembers.length);
                    const slots: (Member | null)[] = [];
                    for (let s = 0; s < totalSlots; s++) {
                      slots.push(groupMembers[s] || null);
                    }

                    return (
                      <div
                        key={group.id}
                        className="print-avoid-break border border-black rounded-2xs bg-white text-black p-1 flex items-stretch gap-1 text-[11px] leading-tight"
                      >
                        {/* ── Left Column: Group & Place Info (~18% width) ── */}
                        <div className="w-[18%] shrink-0 border-r border-gray-400 pr-1 flex flex-col justify-between">
                          <div>
                            <div className="font-black text-[12px] text-black leading-tight">
                              #{item.groupIndex}. {group.group_name}
                            </div>
                            <div className="text-[10px] text-gray-800 font-semibold mt-0.5">
                              {group.location}
                            </div>
                          </div>
                          <div className="mt-0.5 text-[10px] flex items-center justify-between border-t border-gray-300 pt-0.5">
                            <span className="text-gray-600">இலக்கு:</span>
                            <span className="font-black text-black">
                              {formatCurrency(groupTarget)}
                            </span>
                          </div>
                        </div>

                        {/* ── Center Column: Dynamic Member Columns (Supports 5, 6, 7+ members, Full Width, NO Truncation) (~66% width) ── */}
                        <div className="w-[66%] flex flex-row gap-1 items-stretch">
                          {slots.map((member, slotIdx) => (
                            <div
                              key={member?.id || `empty-${slotIdx}`}
                              className="flex-1 min-w-0 border border-gray-300 rounded-2xs p-1 flex flex-col justify-between bg-white"
                            >
                              {member ? (
                                <>
                                  <div className="font-bold text-[11px] text-black break-words leading-tight flex-1">
                                    {slotIdx + 1}. {member.member_name}
                                  </div>
                                  <div className="mt-0.5 flex items-center justify-between pt-0.5 border-t border-gray-200">
                                    <div className="flex items-center gap-1">
                                      <span className="w-3.5 h-3.5 border border-black inline-block rounded-2xs bg-white shrink-0" />
                                      <span className="font-bold text-[10px] text-black">
                                        ₹{formatAmount(member.weekly_installment || weeklyInstallment)}
                                      </span>
                                    </div>
                                    {member.weeks_paid !== undefined && (
                                      <span className="text-[9px] text-gray-600 font-mono">
                                        W{member.weeks_paid + 1}
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-[10px] italic">
                                  <span className="w-3.5 h-3.5 border border-dashed border-gray-400 inline-block mb-0.5" />
                                  <span>காலி</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* ── Right Column: Collector Sign Box (~16% width) ── */}
                        <div className="w-[16%] shrink-0 border-l border-gray-400 pl-1.5 flex flex-col justify-between text-[10px]">
                          <div>
                            <div className="text-gray-700 flex items-center justify-between">
                              <span>வசூல்:</span>
                              <span className="font-bold text-gray-400">₹ ________</span>
                            </div>
                            <div className="text-gray-700 flex items-center justify-between mt-1">
                              <span>ஒப்பம்:</span>
                              <span className="text-gray-400">________</span>
                            </div>
                          </div>
                          <div className="text-right text-[8px] text-gray-500 font-mono">
                            {item.session === 'morning' ? 'காலை' : 'மாலை'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Page Footer on the Final Page ── */}
                {pageIdx === pages.length - 1 && (
                  <div className="print-avoid-break mt-2 pt-1 border-t-2 border-black">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold border border-black p-1.5 bg-gray-50">
                      <div>
                        <span className="text-[10px] text-gray-500 block">மொத்த குழுக்கள்</span>
                        <span className="text-sm font-black">{activeGroups.length}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">உண்மையான வசூல் தொகை</span>
                        <span className="text-sm font-normal text-gray-400">₹ ______________</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">வசூலிப்பாளர் / மேலாளர் கையொப்பம்</span>
                        <span className="text-sm font-normal text-gray-400">___________________</span>
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
