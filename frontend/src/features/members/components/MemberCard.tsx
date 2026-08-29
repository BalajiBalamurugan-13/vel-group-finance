import { Edit, Eye, CheckCircle2, XCircle } from 'lucide-react';
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
  const cashGiven = Number(member.cash_given || 0);
  const weeklyInstallment = Number(member.weekly_installment || 0);
  const immediateCollection = Number(member.immediate_collection || 0);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
      {/* Header: Name, Phone & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-secondary-900 truncate">
              {member.member_name}
            </h3>
            {member.member_code && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-primary-50 text-primary-700 border border-primary-200/60">
                {member.member_code}
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-secondary-500 mt-0.5">
            {member.phone_number}
          </p>
        </div>
        <MemberStatusBadge status={member.status} />
      </div>

      {/* Group & Location */}
      <div className="mt-2.5 flex items-center justify-between text-xs text-secondary-600">
        <span className="font-medium text-secondary-900">
          {member.group_name || 'No Group'}
        </span>
        {member.location && (
          <span className="text-secondary-500">{member.location}</span>
        )}
      </div>

      {/* Financial Details Grid */}
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-secondary-50/80 p-2.5 text-center">
        <div>
          <div className="text-[10px] font-medium uppercase text-secondary-500">
            Loan
          </div>
          <div className="mt-0.5 text-xs font-semibold text-secondary-900">
            {loanAmount > 0 ? formatCurrency(loanAmount) : '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase text-secondary-500">
            Cash Given
          </div>
          <div className="mt-0.5 text-xs font-semibold text-success-600">
            {cashGiven > 0 ? formatCurrency(cashGiven) : '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase text-secondary-500">
            Weekly
          </div>
          <div className="mt-0.5 text-xs font-semibold text-secondary-900">
            {weeklyInstallment > 0 ? formatCurrency(weeklyInstallment) : '—'}
          </div>
        </div>
      </div>

      {/* Late Joining / Immediate Collection notice */}
      {immediateCollection > 0 && member.joined_week > 1 && (
        <div className="mt-2.5 flex items-center justify-between rounded-md bg-warning-50 px-2.5 py-1.5 text-xs font-medium text-warning-800">
          <span>Joined Week {member.joined_week}</span>
          <span>Immediate Due: {formatCurrency(immediateCollection)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3.5 flex items-center gap-2 border-t border-border pt-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 min-h-[44px]"
          onClick={() => onViewDetails(member)}
          leftIcon={<Eye className="h-4 w-4" />}
        >
          Details
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] min-w-[44px] px-2.5"
          onClick={() => onEdit(member)}
          aria-label={`Edit ${member.member_name}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
        {member.status === 'Active' && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] min-w-[44px] px-2.5 text-info-600 hover:bg-info-50"
            onClick={() => onRequestStatusChange(member, 'Completed')}
            aria-label={`Complete ${member.member_name}`}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
        {member.status === 'Completed' && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] min-w-[44px] px-2.5 text-secondary-600 hover:bg-secondary-100"
            onClick={() => onRequestStatusChange(member, 'Closed')}
            aria-label={`Close ${member.member_name}`}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
