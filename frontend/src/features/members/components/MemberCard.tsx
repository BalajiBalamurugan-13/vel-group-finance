import { Edit, Eye, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { MemberStatusBadge } from './MemberStatusBadge';
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
    <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden flex flex-col justify-between">
      <div>
        {/* ── Header: Member Name, Code, Phone, Group, Status ──────────────── */}
        <div className="px-4.5 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-secondary-900 text-sm leading-snug break-words">
                {member.member_name}
              </h3>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {member.member_code && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-secondary-100 text-secondary-600 flex-shrink-0">
                    {member.member_code}
                  </span>
                )}
                <span className="font-mono text-[11px] text-secondary-500 tracking-tight">
                  {member.phone_number}
                </span>
              </div>
              {member.group_name && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-secondary-600 font-medium">
                  <Users className="h-3.5 w-3.5 text-secondary-400 flex-shrink-0" aria-hidden="true" />
                  <span className="break-words leading-snug">{member.group_name}</span>
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              <MemberStatusBadge status={member.status} />
            </div>
          </div>
        </div>

        {/* ── Financial Stats: Balance & Weekly ───────────────────────────── */}
        <div className="px-4.5 py-3 bg-secondary-50/40 border-b border-border/40">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-secondary-500">
                Balance
              </div>
              <div className="mt-0.5 text-sm font-bold text-secondary-900 tabular-nums">
                {formatCurrency(balance)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-secondary-500">
                Weekly
              </div>
              <div className="mt-0.5 text-sm font-bold text-secondary-900 tabular-nums">
                {weeklyInstallment > 0 ? formatCurrency(weeklyInstallment) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Repayment Progress ─────────────────────────────────────────── */}
        <div className="px-4.5 py-3">
          {member.status === 'Active' && totalWeeks > 0 ? (
            <div>
              <div className="flex items-center justify-between text-[11px] font-medium mb-1.5">
                <span className="text-secondary-500 uppercase tracking-wider text-[10px]">
                  Repayment Progress
                </span>
                <span className="text-secondary-700 tabular-nums font-medium">
                  {weeksPaid} / {totalWeeks} weeks
                </span>
              </div>
              <div className="vel-progress-bar">
                <div
                  className="vel-progress-bar-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-1 text-right text-[10px] text-secondary-400">
                {Math.round(progressPct)}% complete
              </div>
            </div>
          ) : (
            <div className="text-xs text-secondary-400 py-1">
              {member.status === 'Completed' ? 'Loan fully settled' : 'No active loan cycle'}
            </div>
          )}

          {/* Late Joining Notice */}
          {immediateCollection > 0 && member.joined_week > 1 && (
            <div className="mt-2.5 flex items-center justify-between rounded-md bg-warning-50 border border-warning-200/60 px-2.5 py-1.5 text-[11px] font-medium text-warning-800">
              <span>Joined Week {member.joined_week}</span>
              <span className="tabular-nums">
                Due: {formatCurrency(immediateCollection)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="px-4.5 py-2.5 border-t border-border/40 bg-secondary-50/20 flex items-center gap-2 mt-auto">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Eye className="h-3.5 w-3.5" />}
          onClick={() => onViewDetails(member)}
          className="flex-1"
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
          <Edit className="h-4 w-4" />
        </Button>
        {member.status === 'Active' && (
          <Button
            variant="ghost"
            size="sm"
            className="px-2.5 text-primary-600 hover:bg-primary-50"
            onClick={() => onRequestStatusChange(member, 'Completed')}
            aria-label={`Mark ${member.member_name} as completed`}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
