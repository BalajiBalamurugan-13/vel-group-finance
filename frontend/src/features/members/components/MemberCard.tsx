import { useMemo } from 'react';
import { Edit, Eye, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { MemberStatusBadge } from './MemberStatusBadge';
import {
  usePlacesRoute,
  buildPlaceLookupMap,
  resolvePlaceRouteInfo,
} from '@/features/places';
import type { Member, MemberStatus } from '../types';

interface MemberCardProps {
  member: Member;
  onViewDetails: (member: Member) => void;
  onEdit: (member: Member) => void;
  onRequestStatusChange: (member: Member, targetStatus: MemberStatus) => void;
}

export function MemberCard({
  member,
  onViewDetails,
  onEdit,
  onRequestStatusChange,
}: MemberCardProps) {
  const { places } = usePlacesRoute();
  const placeLookup = useMemo(() => buildPlaceLookupMap(places), [places]);
  const loanAmount = Number(member.loan_amount || 0);
  const weeklyInstallment = Number(member.weekly_installment || 0);
  const immediateCollection = Number(member.immediate_collection || 0);

  // Repayment progress — from backend bulk query (same source as MemberDetailsModal)
  const weeksPaid = member.weeks_paid ?? 0;
  const totalWeeks =
    weeklyInstallment > 0 ? Math.round(loanAmount / weeklyInstallment) : 0;
  const progressPct =
    totalWeeks > 0 ? Math.min((weeksPaid / totalWeeks) * 100, 100) : 0;

  // Authoritative Formula 5: Outstanding Balance = remaining_installments × weekly_installment
  // (Only Active members carry outstanding balance; Completed/Closed is 0)
  const balance =
    member.outstanding_amount !== undefined && member.outstanding_amount !== null
      ? Number(member.outstanding_amount)
      : member.status === 'Active' && totalWeeks > 0
      ? Math.max(0, totalWeeks - weeksPaid) * weeklyInstallment
      : 0;

  return (
    <div className="relative rounded-xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col justify-between">
      <div>
        {/* ── Header: Member Name, Code, Status, Group & Phone ────────────── */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-secondary-900 text-sm leading-snug break-words">
                  {member.member_name}
                </h3>
                {member.member_code && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-secondary-100 text-secondary-600 flex-shrink-0">
                    {member.member_code}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-secondary-500 flex-wrap">
                {member.group_name && (() => {
                  const routeInfo = resolvePlaceRouteInfo(
                    member.location,
                    member.group_name,
                    placeLookup,
                    places,
                  );
                  const isMorning = routeInfo.session === 'morning';
                  return (
                    <span className="inline-flex items-center gap-1 font-medium text-secondary-600 flex-wrap">
                      <Users className="h-3 w-3 text-secondary-400 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate max-w-[150px]">{member.group_name}</span>
                      {routeInfo.order < 9000 && (
                        <span
                          className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-semibold ${
                            isMorning
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                          }`}
                        >
                          {isMorning ? '☀️' : '🌙'} #{routeInfo.order}
                        </span>
                      )}
                    </span>
                  );
                })()}
                {member.group_name && member.phone_number && (
                  <span className="text-secondary-300">•</span>
                )}
                {member.phone_number && (
                  <span className="font-mono text-[11px] text-secondary-500 tracking-tight">
                    {member.phone_number}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 pt-0.5">
              <MemberStatusBadge status={member.status} />
            </div>
          </div>
        </div>

        {/* ── Financial Stats: Balance & Weekly ───────────────────────────── */}
        <div className="px-4 py-2 bg-secondary-50/60 border-y border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400">
                Balance
              </div>
              <div className="mt-0.5 text-xs font-bold text-secondary-900 font-mono tabular-nums">
                {formatCurrency(balance)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400">
                Weekly
              </div>
              <div className="mt-0.5 text-xs font-bold text-secondary-900 font-mono tabular-nums">
                {weeklyInstallment > 0 ? formatCurrency(weeklyInstallment) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Repayment Progress ─────────────────────────────────────────── */}
        <div className="px-4 py-2">
          {member.status === 'Active' && totalWeeks > 0 ? (
            <div>
              <div className="flex items-center justify-between text-[10px] font-medium mb-1">
                <span className="text-secondary-400 uppercase tracking-wider font-semibold">
                  Repayment Progress
                </span>
                <span className="text-secondary-700 tabular-nums font-semibold">
                  {weeksPaid} / {totalWeeks} wks ({Math.round(progressPct)}%)
                </span>
              </div>
              <div className="vel-progress-bar h-1.5">
                <div
                  className="vel-progress-bar-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-secondary-400 py-0.5">
              {member.status === 'Completed' ? 'Loan fully settled' : 'No active loan cycle'}
            </div>
          )}

          {/* Late Joining Notice */}
          {immediateCollection > 0 && member.joined_week > 1 && (
            <div className="mt-1.5 flex items-center justify-between rounded bg-warning-50 border border-warning-200/60 px-2 py-1 text-[11px] font-medium text-warning-800">
              <span>Joined Week {member.joined_week}</span>
              <span className="tabular-nums font-mono">
                Due: {formatCurrency(immediateCollection)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-border bg-secondary-50/50 flex items-center gap-2 mt-auto">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Eye className="h-3.5 w-3.5" />}
          onClick={() => onViewDetails(member)}
          className="flex-1 text-secondary-700"
        >
          Details
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(member)}
          aria-label={`Edit ${member.member_name}`}
          className="px-2.5 text-secondary-500 hover:text-secondary-700"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        {member.status === 'Active' && (
          <Button
            variant="ghost"
            size="sm"
            className="px-2.5 text-primary-600 hover:bg-primary-50"
            onClick={() => onRequestStatusChange(member, 'Completed')}
            aria-label={`Mark ${member.member_name} as completed`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
