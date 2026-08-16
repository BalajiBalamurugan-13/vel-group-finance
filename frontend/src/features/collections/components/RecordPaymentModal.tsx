import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/format';
import { useMembers } from '@/features/members/hooks/useMembers';
import { useCollections, useRecordCollection } from '../hooks/useCollections';
import type { Member } from '@/features/members/types';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMemberId?: string;
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
}: RecordPaymentModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch active members
  const { data: members = [], isLoading: isLoadingMembers } = useMembers({
    status: 'Active',
  });

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
  const selectedMember = members.find((m) => m.id === selectedMemberId);

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

      reset();
      onClose();
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
      <div className="relative w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div>
            <h2
              id="record-payment-title"
              className="text-lg font-bold text-secondary-900"
            >
              Record Weekly Payment
            </h2>
            <p className="text-xs text-secondary-500 mt-0.5">
              Cash In • Record customer weekly installment
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-3 rounded-lg bg-danger-50 p-3.5 text-danger-800 border border-danger-200 text-sm">
            <AlertCircle className="w-5 h-5 text-danger-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-danger-900">Payment Error</div>
              <div className="text-xs text-danger-700 mt-0.5">{errorMessage}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Member Selection */}
          <div>
            <label
              htmlFor="member_id_select"
              className="block text-xs font-semibold text-secondary-700 uppercase tracking-wider mb-1.5"
            >
              Select Member <span className="text-danger-600">*</span>
            </label>
            <select
              id="member_id_select"
              {...register('member_id', { required: 'Please select a member' })}
              className="w-full h-11 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isLoadingMembers}
            >
              <option value="">
                {isLoadingMembers ? 'Loading members...' : 'Choose an active member...'}
              </option>
              {members.map((m: Member) => (
                <option key={m.id} value={m.id}>
                  {m.member_name} ({m.group_name || 'Group'} • {m.location || ''})
                </option>
              ))}
            </select>
            {errors.member_id && (
              <p className="mt-1 text-xs text-danger-600">
                {errors.member_id.message}
              </p>
            )}
          </div>

          {/* Read-Only Scheme / Group Context */}
          {selectedMember && (
            <div className="rounded-xl bg-secondary-50 p-3.5 border border-secondary-200/80 text-xs space-y-2">
              <div className="flex justify-between items-center text-secondary-700">
                <span className="font-medium">Group:</span>
                <span className="font-semibold text-secondary-900">
                  {selectedMember.group_name} ({selectedMember.location})
                </span>
              </div>
              <div className="flex justify-between items-center text-secondary-700">
                <span className="font-medium">Scheme:</span>
                <span>
                  {selectedMember.scheme_name} (₹{selectedMember.loan_amount})
                </span>
              </div>
              <div className="flex justify-between items-center text-secondary-700">
                <span className="font-medium">Standard Installment:</span>
                <span className="font-bold text-primary-700 text-sm">
                  {formatCurrency(expectedWeekly)}
                </span>
              </div>
              <div className="flex justify-between items-center text-secondary-700">
                <span className="font-medium">Weeks Paid So Far:</span>
                <span className="font-semibold text-secondary-900">
                  {paidWeeksCount} Weeks
                </span>
              </div>
              {selectedMember.immediate_collection && Number(selectedMember.immediate_collection) > 0 && (
                <div className="flex justify-between items-center text-secondary-700">
                  <span className="font-medium">Immediate Due (Late Joining):</span>
                  <span className="font-semibold text-warning-700">
                    {formatCurrency(Number(selectedMember.immediate_collection))}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Week Number & Amount Paid Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Week Number (Sequential Enforcement) */}
            <div>
              <Input
                id="collection-week-number"
                label="Installment Week *"
                type="number"
                value={nextPayableWeek}
                readOnly
                disabled
                errorMessage={errors.week_number?.message}
                helperText={`Next payable installment (Week ${nextPayableWeek})`}
              />
            </div>

            {/* Amount Paid */}
            <div>
              <Input
                id="collection-amount-paid"
                label="Amount Paid (₹) *"
                type="number"
                step="0.01"
                min={1}
                {...register('amount_paid', {
                  required: 'Amount paid is required',
                  min: { value: 1, message: 'Amount must be greater than 0' },
                  valueAsNumber: true,
                })}
                errorMessage={errors.amount_paid?.message}
                placeholder="₹ Amount"
                helperText="Actual cash collected"
              />
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <Input
              id="collection-payment-date"
              label="Payment Date *"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              {...register('payment_date', {
                required: 'Payment date is required',
              })}
              errorMessage={errors.payment_date?.message}
              helperText="Date installment was received"
            />
          </div>

          {/* Remarks */}
          <div>
            <label
              htmlFor="collection-remarks"
              className="block text-xs font-semibold text-secondary-700 uppercase tracking-wider mb-1.5"
            >
              Remarks (Optional)
            </label>
            <textarea
              id="collection-remarks"
              rows={2}
              {...register('remarks')}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. On-time weekly collection, advance, etc."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-[44px] px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting || recordMutation.isPending}
              className="min-h-[44px] px-6 bg-primary-600 hover:bg-primary-700 text-white font-medium"
            >
              Record Payment (Week {nextPayableWeek})
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
