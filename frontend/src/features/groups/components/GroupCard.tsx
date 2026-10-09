import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Edit2, Play, CheckCircle2, Users, Calendar, MapPin } from 'lucide-react';
import { GroupStatusBadge } from './GroupStatusBadge';
import {
  type PlaceRouteConfig,
  resolvePlaceRouteInfo,
} from '@/features/places';
import { useLanguage } from '@/i18n';
import type { Group, GroupStatus } from '../types';

interface GroupCardProps {
  group: Group;
  onEdit: (group: Group) => void;
  onRequestStatusChange: (group: Group, targetStatus: GroupStatus) => void;
  formatMoney: (val: number) => string;
  places?: PlaceRouteConfig[];
  placeLookup?: Map<string, PlaceRouteConfig>;
}

export function GroupCard({
  group,
  onEdit,
  onRequestStatusChange,
  formatMoney,
  places = [],
  placeLookup = new Map(),
}: GroupCardProps) {
  const { language } = useLanguage();
  const schemeName = group.scheme?.scheme_name || 'N/A';

  return (
    <Card className="flex flex-col p-0 overflow-hidden shadow-sm">
      {/* ── Header: Group Name, Code, Status & Location ────────────────── */}
      <div className="px-4 pt-3 pb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-secondary-900 leading-snug break-words">
                {group.group_name}
              </h3>
              {group.group_code && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-secondary-100 text-secondary-600 flex-shrink-0">
                  {group.group_code}
                </span>
              )}
            </div>
            {/* Meta: Location & Date */}
            <div className="mt-1 flex items-center gap-2.5 text-xs text-secondary-500 flex-wrap">
              {(() => {
                const info = resolvePlaceRouteInfo(
                  group.location,
                  group.group_name,
                  placeLookup,
                  places,
                );
                const isMorning = info.session === 'morning';
                return (
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <MapPin className="h-3 w-3 text-secondary-400 flex-shrink-0" />
                    <span className="truncate">{group.location}</span>
                    {info.order < 9000 && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-semibold ${
                          isMorning
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                        }`}
                        title={`${isMorning ? (language === 'ta' ? 'காலை' : 'Morning') : (language === 'ta' ? 'மாலை' : 'Evening')} ${language === 'ta' ? 'வழித்தட நிறுத்தம்' : 'Route Stop'} #${info.order}`}
                      >
                        {isMorning ? '☀️' : '🌙'} #{info.order}
                      </span>
                    )}
                  </span>
                );
              })()}
              {group.start_date && (
                <span className="inline-flex items-center gap-1 flex-shrink-0">
                  <Calendar className="h-3 w-3 text-secondary-400" />
                  {group.start_date}
                </span>
              )}
              {group.funding_source && (
                <span
                  className={
                    group.funding_source === 'Initial Investment'
                      ? 'inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-primary-50 text-primary-700 border border-primary-200'
                      : group.funding_source === 'Additional Investment'
                        ? 'inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200'
                        : group.recycled_sub_type === 'Recycled + Owner Investment'
                          ? 'inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200'
                          : 'inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-secondary-100 text-secondary-600'
                  }
                >
                  {group.funding_source === 'Recycled Collections'
                    ? group.recycled_sub_type === 'Recycled + Owner Investment' && group.owner_investment_amount
                      ? language === 'ta'
                        ? `மறுசுழற்சி + ${formatMoney(group.owner_investment_amount)} சொந்த பணம்`
                        : `Recycled + ${formatMoney(group.owner_investment_amount)} Cash`
                      : language === 'ta' ? 'மறுசுழற்சி' : 'Recycled'
                    : group.funding_source === 'Initial Investment'
                      ? language === 'ta' ? 'ஆரம்ப முதலீடு' : 'Initial Investment'
                      : group.funding_source === 'Additional Investment'
                        ? language === 'ta' ? 'கூடுதல் முதலீடு' : 'Additional Investment'
                        : group.funding_source}
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 pt-0.5">
            <GroupStatusBadge status={group.status} />
          </div>
        </div>
      </div>

      {/* ── Financial & Operations Stats ─────────────────────────────────── */}
      <div className="px-4 py-2.5 bg-secondary-50/60 border-y border-border">
        <div className="grid grid-cols-3 gap-2 items-center">
          {/* Scheme */}
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400 truncate">
              {language === 'ta' ? 'திட்டம்' : 'Scheme'}
            </div>
            <div className="text-xs font-semibold text-secondary-900 truncate mt-0.5" title={`${schemeName} (₹${group.weekly_installment || group.scheme?.weekly_installment || 760}/wk)`}>
              {schemeName} · ₹{group.weekly_installment || group.scheme?.weekly_installment || 760}
            </div>
          </div>

          {/* Members */}
          <div className="text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400">
              {language === 'ta' ? 'உறுப்பினர்கள்' : 'Members'}
            </div>
            <div className="text-xs font-bold text-secondary-900 mt-0.5 flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-secondary-400" />
              <span>{group.member_count}</span>
            </div>
          </div>

          {/* Total Amount */}
          <div className="text-right min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400 truncate">
              {language === 'ta' ? 'மொத்த தொகை' : 'Total Amount'}
            </div>
            <div className="text-xs font-bold text-secondary-900 tabular-nums font-mono mt-0.5 truncate">
              {formatMoney(group.total_group_amount)}
            </div>
          </div>
        </div>
      </div>

      {/* Remarks if any */}
      {group.remarks && (
        <div className="px-4 py-1.5 border-b border-border/50 bg-secondary-50/20">
          <p className="text-[11px] text-secondary-500 line-clamp-1 italic">
            {group.remarks}
          </p>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="mt-auto px-4 py-2 border-t border-border bg-secondary-50/50 flex items-center justify-between gap-2">
        {group.status === 'Draft' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              onClick={() => onEdit(group)}
              className="text-secondary-600 hover:text-secondary-900"
            >
              {language === 'ta' ? 'திருத்து' : 'Edit'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play className="h-3.5 w-3.5" />}
              onClick={() => onRequestStatusChange(group, 'Active')}
            >
              {language === 'ta' ? 'குழுவை இயக்கு' : 'Activate Group'}
            </Button>
          </>
        )}

        {group.status === 'Active' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              onClick={() => onEdit(group)}
              className="text-secondary-600 hover:text-secondary-900"
            >
              {language === 'ta' ? 'திருத்து' : 'Edit'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-primary-600" />}
              onClick={() => onRequestStatusChange(group, 'Completed')}
              className="text-primary-700 hover:bg-primary-50 border-primary-200"
            >
              {language === 'ta' ? 'முடிக்க' : 'Complete'}
            </Button>
          </>
        )}

        {group.status === 'Completed' && (
          <div className="w-full text-center py-0.5">
            <span className="text-xs text-secondary-400 font-medium">
              {language === 'ta' ? 'கடன் சுழற்சி முடிந்தது' : 'Loan cycle completed'}
            </span>
          </div>
        )}

        {group.status === 'Closed' && (
          <div className="w-full text-center py-0.5">
            <span className="text-xs text-secondary-400 font-medium">
              {language === 'ta' ? 'குழு மூடப்பட்டது' : 'Group closed'}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
