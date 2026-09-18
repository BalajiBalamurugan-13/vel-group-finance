import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/utils/format';
import { MemberStatusBadge } from './MemberStatusBadge';
import type { Member } from '../types';
import { useCollections } from '@/features/collections/hooks/useCollections';
import { CreditCard, History, MapPin, Phone, Shield, User } from 'lucide-react';

interface MemberDetailsModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (member: Member) => void;
}

export function MemberDetailsModal({
  member,
  isOpen,
  onClose,
  onEdit,
}: MemberDetailsModalProps) {
  // Fetch payment history for this member
  const { data: memberCollections = [] } = useCollections(
    member?.id ? { member_id: member.id } : undefined,
  );

  if (!isOpen || !member) return null;

  const loanAmount = Number(member.loan_amount || 0);
  const noteCost = Number(member.note_cost || 0);
  const cashGiven = Number(member.cash_given || 0);
  const weeklyInstallment = Number(member.weekly_installment || 0);
  const immediateCollection = Number(member.immediate_collection || 0);
  const currentCycle = member.current_cycle;

  // Calculate repayment progress from actual collection data
  const paidCollections = memberCollections.filter(
    (c) => c.member_id === member.id && c.payment_status === 'Paid',
  );
  const weeksPaid = paidCollections.length;
  const totalWeeks = weeklyInstallment > 0 ? Math.round(loanAmount / weeklyInstallment) : 0;
  const progressPct = totalWeeks > 0 ? Math.min((weeksPaid / totalWeeks) * 100, 100) : 0;
  const totalPaid = paidCollections.reduce(
    (sum, c) => sum + Number(c.amount_paid || 0),
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl my-8 rounded-xl bg-surface p-4 sm:p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-secondary-900 truncate">
                {member.member_name}
              </h2>
              {member.member_code && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-primary-50 text-primary-700 border border-primary-200/60">
                  {member.member_code}
                </span>
              )}
              <MemberStatusBadge status={member.status} />
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-secondary-500 font-mono">
              <Phone className="h-3.5 w-3.5" />
              {member.phone_number}
            </p>
          </div>
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(member);
              }}
            >
              Edit
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-4 text-sm">
          {/* Group Name Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg bg-secondary-50 p-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MapPin className="h-4 w-4 text-primary-600 flex-shrink-0" />
              <span className="font-semibold text-secondary-900 text-sm break-words flex-1 leading-snug">
                {member.group_name || 'No Group'}
              </span>
            </div>
            {member.scheme_name && (
              <span className="rounded-md bg-primary-100/70 px-2.5 py-1 text-xs font-medium text-primary-800 flex-shrink-0">
                {member.scheme_name}
              </span>
            )}
          </div>

          {/* Repayment Progress */}
          {member.status === 'Active' && totalWeeks > 0 && (
            <div className="rounded-xl border border-border p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-secondary-600 mb-2">
                <span>Repayment Progress</span>
                <span className="text-secondary-900">
                  {weeksPaid} / {totalWeeks} weeks • {formatCurrency(totalPaid)} paid
                </span>
              </div>
              <div className="vel-progress-bar" style={{ height: '8px' }}>
                <div
                  className="vel-progress-bar-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-1 text-right text-[11px] text-secondary-500">
                {Math.round(progressPct)}% complete
              </div>
            </div>
          )}

          {/* Financial Overview Card */}
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <div className="flex items-center gap-2 font-semibold text-secondary-900 mb-2.5 text-sm">
              <CreditCard className="h-4 w-4 text-primary-600" />
              Loan & Financial Summary
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="rounded-lg bg-secondary-50 p-2">
                <div className="text-[11px] font-medium uppercase text-secondary-500">
                  Loan Amount
                </div>
                <div className="mt-0.5 text-sm font-bold text-secondary-900">
                  {loanAmount > 0 ? formatCurrency(loanAmount) : '—'}
                </div>
              </div>
              <div className="rounded-lg bg-secondary-50 p-2">
                <div className="text-[11px] font-medium uppercase text-secondary-500">
                  Note Cost
                </div>
                <div className="mt-0.5 text-sm font-bold text-secondary-900">
                  {noteCost > 0 ? formatCurrency(noteCost) : '—'}
                </div>
              </div>
              <div className="rounded-lg bg-success-50/70 p-2">
                <div className="text-[11px] font-medium uppercase text-success-700">
                  Cash Given
                </div>
                <div className="mt-0.5 text-sm font-bold text-success-700">
                  {cashGiven > 0 ? formatCurrency(cashGiven) : '—'}
                </div>
              </div>
              <div className="rounded-lg bg-secondary-50 p-2">
                <div className="text-[11px] font-medium uppercase text-secondary-500">
                  Weekly Inst.
                </div>
                <div className="mt-0.5 text-sm font-bold text-secondary-900">
                  {weeklyInstallment > 0
                    ? formatCurrency(weeklyInstallment)
                    : '—'}
                </div>
              </div>
            </div>

            {/* Late Joining Highlight */}
            {immediateCollection > 0 && member.joined_week > 1 && (
              <div className="mt-2.5 rounded-lg border border-warning-200 bg-warning-50/70 p-2.5 text-xs text-warning-900">
                <div className="font-semibold">
                  Late Joining Notice (Week {member.joined_week})
                </div>
                <div className="mt-0.5 text-warning-800">
                  Immediate Collection Due (Missed + Current):{' '}
                  <span className="font-bold">
                    {formatCurrency(immediateCollection)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Member Profile Details */}
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <div className="flex items-center gap-2 font-semibold text-secondary-900 mb-2.5 text-sm">
              <User className="h-4 w-4 text-primary-600" />
              Member Profile
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <span className="text-secondary-500">Address:</span>
                <p className="mt-0.5 font-medium text-secondary-900 break-words">
                  {member.address}
                </p>
              </div>
              <div>
                <span className="text-secondary-500">Joined Date:</span>
                <p className="mt-0.5 font-medium text-secondary-900">
                  {member.joined_date ? formatDate(member.joined_date) : '—'} (Week {member.joined_week})
                </p>
              </div>
              <div>
                <span className="text-secondary-500">Nominee:</span>
                <p className="mt-0.5 font-medium text-secondary-900">
                  {member.nominee || '—'}
                </p>
              </div>
              <div>
                <span className="text-secondary-500">ID Proof:</span>
                <p className="mt-0.5 font-medium text-secondary-900">
                  {member.id_proof || '—'}
                </p>
              </div>
              {member.remarks && (
                <div className="sm:col-span-2">
                  <span className="text-secondary-500">Remarks:</span>
                  <p className="mt-0.5 font-medium text-secondary-900">
                    {member.remarks}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Current Loan Cycle Details */}
          {currentCycle && (
            <div className="rounded-xl border border-border bg-surface p-3.5">
              <div className="flex items-center gap-2 font-semibold text-secondary-900 mb-2 text-sm">
                <Shield className="h-4 w-4 text-primary-600" />
                Loan Cycle Information
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-secondary-600">
                <div>
                  Cycle Number:{' '}
                  <span className="font-semibold text-secondary-900">
                    Cycle {currentCycle.cycle_number}
                  </span>
                </div>
                <div>
                  Cycle Status:{' '}
                  <span className="font-semibold text-secondary-900">
                    {currentCycle.status}
                  </span>
                </div>
                {currentCycle.loan_transaction && (
                  <>
                    <div>
                      Disbursed Date:{' '}
                      <span className="font-medium text-secondary-900">
                        {formatDate(
                          currentCycle.loan_transaction.disbursement_date,
                        )}
                      </span>
                    </div>
                    <div>
                      Disbursed Amount:{' '}
                      <span className="font-semibold text-success-700">
                        {formatCurrency(
                          Number(currentCycle.loan_transaction.cash_given),
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Payment History */}
          {paidCollections.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-3.5">
              <div className="flex items-center gap-2 font-semibold text-secondary-900 mb-2.5 text-sm">
                <History className="h-4 w-4 text-primary-600" />
                Payment History ({paidCollections.length} payments)
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {paidCollections
                  .sort((a, b) => a.week_number - b.week_number)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-md bg-secondary-50/60 px-3 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-5 rounded bg-secondary-200 text-[10px] font-bold text-secondary-700">
                          W{c.week_number}
                        </span>
                        <span className="text-secondary-500">
                          {formatDate(c.payment_date)}
                        </span>
                      </div>
                      <span className="font-semibold text-secondary-900">
                        {formatCurrency(Number(c.amount_paid))}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end border-t border-border pt-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
