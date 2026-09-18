import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { X, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/format';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useMembers, useMember } from '@/features/members/hooks/useMembers';
import { useCollections, useRecordCollection } from '../hooks/useCollections';
import type { Member } from '@/features/members/types';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMemberId?: string;
  onSuccess?: (paymentInfo: {
    week: number;
    memberName: string;
    amount: number;
  }) => void;
}

interface FormValues {
  member_id: string;
  week_number: number;
  amount_paid: number;
  payment_date: string;
  remarks: string;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  initialMemberId,
  onSuccess,
}: RecordPaymentModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Optional: fetch initial member if provided to auto-select their group
  const { data: initialMember } = useMember(initialMemberId || '');

  useEffect(() => {
    if (initialMember?.group_id) {
      setSelectedGroupId(initialMember.group_id);
    }
  }, [initialMember]);

  // Fetch active groups for group-first selection
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups({
    status: 'Active',
  });

  // Fetch active members belonging strictly to the selected group
  const { data: groupMembers = [], isLoading: isLoadingMembers } = useMembers(
    selectedGroupId ? { group_id: selectedGroupId, status: 'Active' } : undefined,
    { enabled: Boolean(selectedGroupId) },
  );

  // Display members in creation order (oldest first: M-0001, M-0002...)
  const sortedMembers = useMemo(() => {
    return [...groupMembers].sort((a, b) => {
      const codeA = a.member_code || '';
      const codeB = b.member_code || '';
      if (codeA && codeB) {
        return codeA.localeCompare(codeB, undefined, { numeric: true });
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [groupMembers]);

  const recordMutation = useRecordCollection();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      member_id: initialMemberId || '',
      week_number: 1,
      amount_paid: 0,
      payment_date: new Date().toISOString().split('T')[0],
      remarks: '',
    },
  });

  const selectedMemberId = watch('member_id');
  const selectedMember = sortedMembers.find((m) => m.id === selectedMemberId);

  // Query this member's recorded collections to determine the exact next payable week
  const { data: memberCollections = [] } = useCollections(
    selectedMemberId ? { member_id: selectedMemberId } : undefined
  );

  const paidWeeksCount = memberCollections.filter(
    (c) => c.member_id === selectedMemberId && c.payment_status === 'Paid'
  ).length;

  const nextPayableWeek = paidWeeksCount + 1;

  // Auto-fill member details and defaults when a member is chosen
  useEffect(() => {
    if (selectedMember) {
      const weeklyInst = Number(selectedMember.weekly_installment || 0);
      setValue('amount_paid', weeklyInst);
      setValue('week_number', nextPayableWeek);
    }
  }, [selectedMember, nextPayableWeek, setValue]);

  useEffect(() => {
    if (initialMemberId) {
      setValue('member_id', initialMemberId);
    }
  }, [initialMemberId, setValue]);

  if (!isOpen) return null;

  const handleClose = () => {
    setErrorMessage(null);
    setSelectedGroupId('');
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    setErrorMessage(null);

    try {
      await recordMutation.mutateAsync({
        member_id: values.member_id,
        week_number: Number(nextPayableWeek),
        amount_paid: Number(values.amount_paid),
        payment_date: values.payment_date || undefined,
        remarks: values.remarks?.trim() || undefined,
      });

      // Confirmed success: notify parent to show success toast
      const memberName = selectedMember?.member_name || 'Member';
      onSuccess?.({
        week: Number(nextPayableWeek),
        memberName,
        amount: Number(values.amount_paid),
      });

      handleClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to record weekly collection payment.';
      setErrorMessage(msg);
    }
  };

  const expectedWeekly = Number(selectedMember?.weekly_installment || 0);

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-secondary-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
    >
        <div className="relative w-full max-w-lg rounded-2xl bg-surface p-4 sm:p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div>
              <h2
                id="record-payment-title"
                className="text-lg font-bold text-secondary-900"
              >
                Record Weekly Payment
              </h2>
              <p className="text-xs text-secondary-500 mt-0.5">
                Cash In • Weekly installment
              </p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-error-50 p-3 text-sm border border-error-200">
              <AlertCircle className="w-5 h-5 text-error-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-error-900">Payment Error</div>
                <div className="text-xs text-error-700 mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Step 1: Group Selection */}
            <div>
              <label
                htmlFor="group_id_select"
                className="block text-sm font-medium text-secondary-700 mb-1.5"
              >
                Select Group <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="group_id_select"
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setValue('member_id', '');
                  }}
                  className="w-full h-11 min-h-[44px] px-3 py-2 bg-surface border border-border rounded-lg text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none truncate font-sans cursor-pointer pr-8"
                  disabled={isLoadingGroups}
                >
                  <option value="">
                    {isLoadingGroups ? 'Loading active groups...' : 'Choose an active group...'}
                  </option>
                  {groups
                    .filter((g) => g.status === 'Active')
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.group_name} {g.location ? `(${g.location})` : ''}
                      </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-secondary-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Step 2: Member Selection (scoped to selected group, in creation order) */}
            <div>
              <label
                htmlFor="member_id_select"
                className="block text-sm font-medium text-secondary-700 mb-1.5"
              >
                Select Member <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="member_id_select"
                  {...register('member_id', { required: 'Please select a member' })}
                  className="w-full h-11 min-h-[44px] px-3 py-2 bg-surface border border-border rounded-lg text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none truncate font-sans cursor-pointer pr-8 disabled:bg-secondary-50 disabled:text-secondary-400 disabled:cursor-not-allowed"
                  disabled={!selectedGroupId || isLoadingMembers}
                >
                  <option value="">
                    {!selectedGroupId
                      ? 'Choose a group above first...'
                      : isLoadingMembers
                      ? 'Loading group members...'
                      : sortedMembers.length === 0
                      ? 'No active members in this group'
                      : 'Choose a member from this group...'}
                  </option>
                  {sortedMembers.map((m: Member) => (
                    <option key={m.id} value={m.id}>
                      {m.member_code ? `${m.member_code} — ` : ''}{m.member_name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-secondary-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
              {errors.member_id && (
                <p className="mt-1 text-xs text-error-600">
                  {errors.member_id.message}
                </p>
              )}
            </div>

            {/* Read-Only Scheme / Group Context */}
            {selectedMember && (
              <div className="rounded-lg bg-secondary-50 p-3 border border-secondary-200/80 text-xs space-y-1.5">
                <div className="flex justify-between items-start gap-2 text-secondary-700">
                  <span className="font-medium flex-shrink-0">Member:</span>
                  <span className="font-semibold text-secondary-900 break-words text-right flex-1">
                    {selectedMember.member_name} {selectedMember.member_code ? `(${selectedMember.member_code})` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2 text-secondary-700">
                  <span className="font-medium flex-shrink-0">Group:</span>
                  <span className="font-semibold text-secondary-900 break-words text-right flex-1">
                    {selectedMember.group_name} {selectedMember.location ? `(${selectedMember.location})` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center text-secondary-700">
                  <span className="font-medium">Standard Installment:</span>
                  <span className="font-bold text-primary-700 text-sm">
                    {formatCurrency(expectedWeekly)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-secondary-700">
                  <span className="font-medium">Weeks Paid:</span>
                  <span className="font-semibold text-secondary-900">
                    {paidWeeksCount}
                  </span>
                </div>
                {selectedMember.immediate_collection && Number(selectedMember.immediate_collection) > 0 && (
                  <div className="flex justify-between items-center text-warning-700">
                    <span className="font-medium">Immediate Due:</span>
                    <span className="font-semibold">
                      {formatCurrency(Number(selectedMember.immediate_collection))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Week Number & Amount Paid Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Week Number (Sequential Enforcement) */}
              <div>
                <Input
                  id="collection-week-number"
                  label="Week *"
                  type="number"
                  value={nextPayableWeek}
                  readOnly
                  disabled
                  errorMessage={errors.week_number?.message}
                />
              </div>

              {/* Amount Paid */}
              <div>
                <Input
                  id="collection-amount-paid"
                  label="Amount (₹) *"
                  type="number"
                  step="0.01"
                  min={1}
                  {...register('amount_paid', {
                    required: 'Amount is required',
                    min: { value: 1, message: 'Must be > 0' },
                    valueAsNumber: true,
                  })}
                  errorMessage={errors.amount_paid?.message}
                  placeholder="₹ Amount"
                />
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <Input
                id="collection-payment-date"
                label="Payment Date *"
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                {...register('payment_date', {
                  required: 'Payment date is required',
                })}
                errorMessage={errors.payment_date?.message}
              />
            </div>

            {/* Remarks */}
            <div>
              <label
                htmlFor="collection-remarks"
                className="block text-sm font-medium text-secondary-700 mb-1.5"
              >
                Remarks (Optional)
              </label>
              <textarea
                id="collection-remarks"
                rows={2}
                {...register('remarks')}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmitting || recordMutation.isPending}
              >
                Record Payment (Week {nextPayableWeek})
              </Button>
            </div>
          </form>
        </div>
      </div>
  );
}
