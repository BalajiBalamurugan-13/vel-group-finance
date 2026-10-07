import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import {
  X,
  AlertCircle,
  ChevronDown,
  Users,
  UserCheck,
  CheckSquare,
  Square,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/format';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useMembers, useMember } from '@/features/members/hooks/useMembers';
import {
  useCollections,
  useRecordCollection,
  useRecordBulkCollections,
} from '../hooks/useCollections';
import { useLanguage } from '@/i18n';
import type { Member } from '@/features/members/types';
import type { CollectionCreate } from '../types';

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

interface SingleFormValues {
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
  const { t } = useLanguage();

  // Mode: 'batch' (Group collection) by default, or 'single' if opened with initialMemberId
  const [entryMode, setEntryMode] = useState<'batch' | 'single'>(
    initialMemberId ? 'single' : 'batch'
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Optional: fetch initial member if provided to auto-select their group
  const { data: initialMember } = useMember(initialMemberId || '');

  useEffect(() => {
    if (initialMember?.group_id) {
      setSelectedGroupId(initialMember.group_id);
      setEntryMode('single');
    }
  }, [initialMember]);

  // Fetch active groups for group selection
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups({
    status: 'Active',
  });

  // Automatically select the first group in batch mode if none selected
  useEffect(() => {
    if (!selectedGroupId && groups.length > 0 && entryMode === 'batch') {
      setSelectedGroupId(groups[0].id);
    }
  }, [selectedGroupId, groups, entryMode]);

  // Selected group object & scheme details
  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId),
    [groups, selectedGroupId]
  );
  const groupTotalWeeks = selectedGroup?.scheme?.total_weeks || 15;
  const groupDefaultWeekly = Number(selectedGroup?.weekly_installment || selectedGroup?.scheme?.weekly_installment || 760);

  // Fetch active members belonging strictly to the selected group
  const {
    data: groupMembers = [],
    isLoading: isLoadingMembers,
    refetch: refetchMembers,
  } = useMembers(
    selectedGroupId ? { group_id: selectedGroupId, status: 'Active' } : undefined,
    { enabled: Boolean(selectedGroupId) && isOpen }
  );

  // Automatically refetch members whenever modal opens with a selected group
  useEffect(() => {
    if (isOpen && selectedGroupId) {
      refetchMembers();
    }
  }, [isOpen, selectedGroupId, refetchMembers]);

  // Display members in creation order (M-0001, M-0002...)
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

  // ── Batch Mode State ────────────────────────────────────────────────────────
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [memberAmounts, setMemberAmounts] = useState<Record<string, number | string>>({});
  const [memberWeeks, setMemberWeeks] = useState<Record<string, number>>({});
  const [batchPaymentDate, setBatchPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [batchRemarks, setBatchRemarks] = useState<string>('');
  const [quickAmountInput, setQuickAmountInput] = useState<string>(String(groupDefaultWeekly || 760));

  // Keep quickAmountInput in sync when selected group changes
  useEffect(() => {
    if (groupDefaultWeekly) {
      setQuickAmountInput(String(groupDefaultWeekly));
    }
  }, [groupDefaultWeekly]);

  // When group members load, group changes, or modal opens, initialize batch member states
  useEffect(() => {
    if (!isOpen) {
      setSelectedMemberIds(new Set());
      setMemberAmounts({});
      setMemberWeeks({});
      return;
    }

    if (sortedMembers.length > 0) {
      const initialSelected = new Set<string>();
      const initialAmounts: Record<string, number | string> = {};
      const initialWeeks: Record<string, number> = {};

      sortedMembers.forEach((m) => {
        const weeksPaid = m.weeks_paid || 0;
        const isCompleted = weeksPaid >= groupTotalWeeks;
        if (!isCompleted) {
          initialSelected.add(m.id);
        }

        const defaultAmount = Number(m.weekly_installment || groupDefaultWeekly || 760);
        initialAmounts[m.id] = defaultAmount;
        initialWeeks[m.id] = weeksPaid + 1;
      });

      setSelectedMemberIds(initialSelected);
      setMemberAmounts(initialAmounts);
      setMemberWeeks(initialWeeks);
    } else {
      setSelectedMemberIds(new Set());
      setMemberAmounts({});
      setMemberWeeks({});
    }
  }, [isOpen, sortedMembers, groupTotalWeeks, groupDefaultWeekly]);

  // Batch Selection Toggles
  const isAllSelected = useMemo(() => {
    if (sortedMembers.length === 0) return false;
    const payableMembers = sortedMembers.filter((m) => (m.weeks_paid || 0) < groupTotalWeeks);
    if (payableMembers.length === 0) return false;
    return payableMembers.every((m) => selectedMemberIds.has(m.id));
  }, [sortedMembers, selectedMemberIds, groupTotalWeeks]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMemberIds(new Set());
    } else {
      const payableMembers = sortedMembers.filter((m) => (m.weeks_paid || 0) < groupTotalWeeks);
      setSelectedMemberIds(new Set(payableMembers.map((m) => m.id)));
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const updateMemberAmount = (memberId: string, value: string | number) => {
    setMemberAmounts((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  const updateMemberWeek = (memberId: string, value: number) => {
    setMemberWeeks((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  // Quick Apply Amount to all selected members
  const applyQuickAmount = (amountToApply: number | string) => {
    const val = Number(amountToApply) || 760;
    setMemberAmounts((prev) => {
      const updated = { ...prev };
      selectedMemberIds.forEach((id) => {
        updated[id] = val;
      });
      return updated;
    });
  };

  // Computed totals for Batch Mode
  const checkedMembers = useMemo(() => {
    return sortedMembers.filter((m) => selectedMemberIds.has(m.id));
  }, [sortedMembers, selectedMemberIds]);

  const totalBatchAmount = useMemo(() => {
    return checkedMembers.reduce((sum, m) => {
      const amt = Number(memberAmounts[m.id]) || 0;
      return sum + amt;
    }, 0);
  }, [checkedMembers, memberAmounts]);

  // ── Single Mode React Hook Form ─────────────────────────────────────────────
  const recordSingleMutation = useRecordCollection();
  const recordBulkMutation = useRecordBulkCollections();

  const {
    register,
    handleSubmit: handleSingleSubmit,
    setValue: setSingleValue,
    watch: watchSingle,
    reset: resetSingleForm,
    formState: { errors: singleErrors, isSubmitting: isSingleSubmitting },
  } = useForm<SingleFormValues>({
    defaultValues: {
      member_id: initialMemberId || '',
      week_number: 1,
      amount_paid: 760,
      payment_date: new Date().toISOString().split('T')[0],
      remarks: '',
    },
  });

  const singleMemberId = watchSingle('member_id');
  const selectedSingleMember = sortedMembers.find((m) => m.id === singleMemberId);

  // Single member collections to calculate sequential week
  const { data: memberCollections = [] } = useCollections(
    singleMemberId ? { member_id: singleMemberId } : undefined
  );

  const singlePaidWeeksCount = memberCollections.filter(
    (c) => c.member_id === singleMemberId && c.payment_status === 'Paid'
  ).length;
  const singleNextPayableWeek = singlePaidWeeksCount + 1;

  useEffect(() => {
    if (selectedSingleMember) {
      const weeklyInst = Number(selectedSingleMember.weekly_installment || groupDefaultWeekly || 760);
      setSingleValue('amount_paid', weeklyInst);
      setSingleValue('week_number', singleNextPayableWeek);
    }
  }, [selectedSingleMember, singleNextPayableWeek, groupDefaultWeekly, setSingleValue]);

  useEffect(() => {
    if (initialMemberId) {
      setSingleValue('member_id', initialMemberId);
    }
  }, [initialMemberId, setSingleValue]);

  // ── Modal Close & Cleanup ───────────────────────────────────────────────────
  const handleClose = () => {
    setErrorMessage(null);
    setWarningMessage(null);
    setSelectedMemberIds(new Set());
    setMemberAmounts({});
    setMemberWeeks({});
    resetSingleForm();
    onClose();
  };

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Submit Handlers ─────────────────────────────────────────────────────────

  // Batch Submission
  const onBatchSubmit = async () => {
    setErrorMessage(null);
    setWarningMessage(null);

    if (checkedMembers.length === 0) {
      setErrorMessage('Please check at least one member to record payment.');
      return;
    }

    const items: CollectionCreate[] = [];
    for (const m of checkedMembers) {
      const amount = Number(memberAmounts[m.id]);
      if (isNaN(amount) || amount <= 0) {
        setErrorMessage(`Invalid installment amount for member ${m.member_name}.`);
        return;
      }
      const week = Number(memberWeeks[m.id]) || (m.weeks_paid || 0) + 1;
      items.push({
        member_id: m.id,
        week_number: week,
        amount_paid: amount,
        payment_date: batchPaymentDate || undefined,
        remarks: batchRemarks.trim() || undefined,
      });
    }

    try {
      const result = await recordBulkMutation.mutateAsync(items);

      if (result.errors && result.errors.length > 0) {
        setWarningMessage(
          `Recorded ${result.total_recorded} payments. Skipped: ${result.errors.join(', ')}`
        );
      }

      // Immediately advance week numbers locally for instant responsiveness
      setMemberWeeks((prev) => {
        const updated = { ...prev };
        checkedMembers.forEach((m) => {
          const currentWk = Number(prev[m.id]) || (m.weeks_paid || 0) + 1;
          updated[m.id] = currentWk + 1;
        });
        return updated;
      });

      const minWeek = items[0]?.week_number || 1;
      const groupTitle = selectedGroup?.group_name || 'Group';
      onSuccess?.({
        week: minWeek,
        memberName: `${groupTitle} (${result.total_recorded} members)`,
        amount: Number(result.total_amount),
      });

      handleClose();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string; detail?: string } };
        message?: string;
      };
      const msg =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Failed to record batch payments.';
      setErrorMessage(msg);
    }
  };

  // Single Submission
  const onSingleSubmit = async (values: SingleFormValues) => {
    setErrorMessage(null);
    setWarningMessage(null);

    try {
      await recordSingleMutation.mutateAsync({
        member_id: values.member_id,
        week_number: Number(singleNextPayableWeek),
        amount_paid: Number(values.amount_paid),
        payment_date: values.payment_date || undefined,
        remarks: values.remarks?.trim() || undefined,
      });

      const memberName = selectedSingleMember?.member_name || 'Member';
      onSuccess?.({
        week: Number(singleNextPayableWeek),
        memberName,
        amount: Number(values.amount_paid),
      });

      handleClose();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string; detail?: string } };
        message?: string;
      };
      const msg =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Failed to record weekly collection payment.';
      setErrorMessage(msg);
    }
  };

  const isSubmitting =
    recordBulkMutation.isPending || recordSingleMutation.isPending || isSingleSubmitting;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-secondary-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg sm:max-w-2xl md:max-w-3xl rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border border-border max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden">
        {/* ── Modal Pinned Header ────────────────────────────────────────────── */}
        <div className="flex flex-col border-b border-border bg-surface px-4 py-3 sm:px-6 sm:py-3.5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center">
                {entryMode === 'batch' ? (
                  <Users className="w-5 h-5 text-primary-600" />
                ) : (
                  <UserCheck className="w-5 h-5 text-primary-600" />
                )}
              </div>
              <div>
                <h2
                  id="record-payment-title"
                  className="text-base sm:text-lg font-bold text-secondary-900 leading-tight"
                >
                  {entryMode === 'batch' ? 'Group Collection Entry' : t('modal.recordPaymentTitle')}
                </h2>
                <p className="text-xs text-secondary-500 mt-0.5">
                  {entryMode === 'batch'
                    ? 'Fast batch entry — select group & record all active members in one click'
                    : t('modal.recordPaymentSubtitle')}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-3 flex items-center bg-secondary-100/80 p-1 rounded-xl w-full sm:w-auto self-start border border-secondary-200/60">
            <button
              type="button"
              onClick={() => {
                setEntryMode('batch');
                setErrorMessage(null);
              }}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                entryMode === 'batch'
                  ? 'bg-surface text-primary-700 shadow-xs'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Group Batch (Fast)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode('single');
                setErrorMessage(null);
              }}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                entryMode === 'single'
                  ? 'bg-surface text-primary-700 shadow-xs'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Single Member</span>
            </button>
          </div>
        </div>

        {/* ── Alerts ─────────────────────────────────────────────────────────── */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-start gap-3 rounded-lg bg-error-50 p-3 text-sm border border-error-200">
            <AlertCircle className="w-5 h-5 text-error-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-error-900">Payment Error</div>
              <div className="text-xs text-error-700 mt-0.5">{errorMessage}</div>
            </div>
          </div>
        )}

        {warningMessage && (
          <div className="mx-4 sm:mx-6 mt-3 flex items-start gap-3 rounded-lg bg-warning-50 p-3 text-sm border border-warning-200">
            <Info className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-warning-900">Notice</div>
              <div className="text-xs text-warning-700 mt-0.5">{warningMessage}</div>
            </div>
          </div>
        )}

        {/* ── Mode Content ───────────────────────────────────────────────────── */}
        {entryMode === 'batch' ? (
          /* ================================================================= */
          /* GROUP BATCH COLLECTION MODE                                       */
          /* ================================================================= */
          <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Scrollable Batch Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Top Controls: Group Select + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-secondary-50/60 p-3.5 rounded-xl border border-secondary-200/80">
                {/* Group Dropdown */}
                <div>
                  <label
                    htmlFor="batch_group_select"
                    className="block text-xs font-semibold uppercase tracking-wider text-secondary-600 mb-1"
                  >
                    Select Group <span className="text-error-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="batch_group_select"
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full h-10 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm font-medium text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer pr-8 shadow-xs"
                      disabled={isLoadingGroups}
                    >
                      <option value="">
                        {isLoadingGroups ? 'Loading groups...' : 'Choose a group...'}
                      </option>
                      {groups
                        .filter((g) => g.status === 'Active')
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.group_name} {g.location ? `(${g.location})` : ''} ·{' '}
                            {g.member_count} members
                          </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-secondary-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Batch Payment Date */}
                <div>
                  <label
                    htmlFor="batch_payment_date"
                    className="block text-xs font-semibold uppercase tracking-wider text-secondary-600 mb-1"
                  >
                    Collection Date <span className="text-error-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="batch_payment_date"
                      type="date"
                      value={batchPaymentDate}
                      onChange={(e) => setBatchPaymentDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full h-10 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm font-medium text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Group Scheme Quick Info */}
              {selectedGroup && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-primary-50/60 border border-primary-100 text-xs text-primary-900">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      Scheme: {selectedGroup.scheme?.scheme_name || 'Standard'}
                    </span>
                    <span>•</span>
                    <span>Installment: {formatCurrency(groupDefaultWeekly)}</span>
                    <span>•</span>
                    <span>Total: {groupTotalWeeks} Weeks</span>
                  </div>
                  <div className="text-secondary-600">
                    Active Members: <span className="font-bold">{sortedMembers.length}</span>
                  </div>
                </div>
              )}

              {/* Batch Action Toolbar: Select All + Quick Presets */}
              {sortedMembers.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 pb-1 border-b border-border/70">
                  {/* Select All Checkbox */}
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-secondary-800 hover:text-primary-700 transition-colors select-none py-1"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary-600" />
                    ) : (
                      <Square className="w-4 h-4 text-secondary-400" />
                    )}
                    <span>
                      Select All Members ({checkedMembers.length}/{sortedMembers.length} checked)
                    </span>
                  </button>

                  {/* Fast Amount Fill Presets */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
                    <span className="text-secondary-500 hidden sm:inline">Set all to:</span>
                    <button
                      type="button"
                      onClick={() => applyQuickAmount(groupDefaultWeekly || 760)}
                      className="px-2 py-1 rounded bg-secondary-100 hover:bg-secondary-200 text-secondary-800 font-mono font-semibold transition-colors"
                    >
                      ₹{groupDefaultWeekly || 760}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickAmount(1000)}
                      className="px-2 py-1 rounded bg-secondary-100 hover:bg-secondary-200 text-secondary-800 font-mono font-semibold transition-colors"
                    >
                      ₹1,000
                    </button>
                    <div className="flex items-center gap-1 ml-1">
                      <input
                        type="number"
                        step="10"
                        min="1"
                        value={quickAmountInput}
                        onChange={(e) => setQuickAmountInput(e.target.value)}
                        placeholder="₹"
                        className="w-16 h-7 px-1.5 text-xs text-right font-mono border border-border rounded bg-surface focus:ring-1 focus:ring-primary-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => applyQuickAmount(quickAmountInput)}
                        className="px-2 py-1 rounded bg-primary-100 hover:bg-primary-200 text-primary-800 font-semibold text-[11px] transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2">
                {isLoadingMembers ? (
                  <div className="text-center py-10 text-sm text-secondary-500">
                    Loading group members...
                  </div>
                ) : !selectedGroupId ? (
                  <div className="text-center py-10 text-sm text-secondary-500">
                    Select a group above to load members
                  </div>
                ) : sortedMembers.length === 0 ? (
                  <div className="text-center py-10 text-sm text-secondary-500">
                    No active members found in this group
                  </div>
                ) : (
                  sortedMembers.map((member: Member) => {
                    const isChecked = selectedMemberIds.has(member.id);
                    const weeksPaid = member.weeks_paid || 0;
                    const isCompleted = weeksPaid >= groupTotalWeeks;
                    const nextWeek = memberWeeks[member.id] || weeksPaid + 1;
                    const currentAmt = memberAmounts[member.id] ?? (member.weekly_installment || groupDefaultWeekly || 760);

                    return (
                      <div
                        key={member.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all ${
                          isCompleted
                            ? 'bg-secondary-50/50 border-secondary-200 opacity-60'
                            : isChecked
                            ? 'bg-surface border-primary-200/90 shadow-xs hover:border-primary-300'
                            : 'bg-surface border-border hover:bg-secondary-50/50'
                        }`}
                      >
                        {/* Member Identity & Toggle */}
                        <div
                          className="flex items-center gap-3 flex-1 cursor-pointer select-none"
                          onClick={() => {
                            if (!isCompleted) toggleMemberSelection(member.id);
                          }}
                        >
                          <button
                            type="button"
                            disabled={isCompleted}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isCompleted) toggleMemberSelection(member.id);
                            }}
                            className="p-1 rounded text-primary-600 focus:outline-none"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 text-primary-600" />
                            ) : (
                              <Square className="w-5 h-5 text-secondary-300" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {member.member_code && (
                                <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-secondary-100 text-secondary-700">
                                  {member.member_code}
                                </span>
                              )}
                              <span
                                className={`text-sm font-semibold truncate ${
                                  isChecked ? 'text-secondary-900' : 'text-secondary-600'
                                }`}
                              >
                                {member.member_name}
                              </span>
                              {isCompleted && (
                                <Badge variant="success" className="text-[10px] py-0 px-1.5">
                                  Completed ({weeksPaid}/{groupTotalWeeks})
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-secondary-400 mt-0.5 flex items-center gap-2">
                              <span>
                                Paid: {weeksPaid}/{groupTotalWeeks} wks
                              </span>
                              {member.phone_number && (
                                <span className="hidden sm:inline text-secondary-300">
                                  • {member.phone_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Week & Amount Inputs */}
                        <div className="mt-2.5 sm:mt-0 flex items-center gap-3 pl-8 sm:pl-0 flex-shrink-0">
                          {/* Week Number */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-secondary-500 font-medium">Wk:</span>
                            <input
                              type="number"
                              min={1}
                              max={groupTotalWeeks}
                              value={nextWeek}
                              disabled={!isChecked || isCompleted}
                              onChange={(e) =>
                                updateMemberWeek(member.id, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-14 h-8 text-center font-mono font-bold text-xs bg-surface border border-border rounded-lg focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:bg-secondary-100"
                            />
                          </div>

                          {/* Installment Amount Input */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-secondary-500 font-medium">₹</span>
                            <input
                              type="number"
                              step="10"
                              min={1}
                              value={currentAmt}
                              disabled={!isChecked || isCompleted}
                              onChange={(e) => updateMemberAmount(member.id, e.target.value)}
                              className="w-24 h-8 px-2 text-right font-mono font-bold text-sm bg-surface border border-border rounded-lg text-secondary-900 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:bg-secondary-100 shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Optional Batch Remarks */}
              {sortedMembers.length > 0 && (
                <div className="pt-2">
                  <label
                    htmlFor="batch_remarks_input"
                    className="block text-xs font-semibold text-secondary-600 mb-1"
                  >
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    id="batch_remarks_input"
                    type="text"
                    value={batchRemarks}
                    onChange={(e) => setBatchRemarks(e.target.value)}
                    placeholder="e.g. Sunday group collection"
                    className="w-full h-9 px-3 text-xs bg-surface border border-border rounded-lg text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-secondary-400"
                  />
                </div>
              )}
            </div>

            {/* Pinned Batch Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border bg-surface flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-md">
              <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                <div className="text-xs text-secondary-600">
                  Selected:{' '}
                  <span className="font-bold text-secondary-900">{checkedMembers.length}</span> of{' '}
                  {sortedMembers.length}
                </div>
                <div className="text-sm font-semibold text-secondary-800">
                  Total:{' '}
                  <span className="text-base font-extrabold font-mono text-primary-700 ml-1">
                    {formatCurrency(totalBatchAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="min-h-[42px] px-4 text-xs font-semibold"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onBatchSubmit}
                  isLoading={isSubmitting}
                  disabled={checkedMembers.length === 0 || isSubmitting}
                  className="min-h-[42px] flex-1 sm:flex-initial px-5 font-semibold text-sm shadow-sm"
                >
                  {isSubmitting
                    ? 'Recording...'
                    : `Record ${checkedMembers.length} Payments (${formatCurrency(totalBatchAmount)})`}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* SINGLE MEMBER COLLECTION MODE (LEGACY / INDIVIDUAL ENTRY)         */
          /* ================================================================= */
          <form
            onSubmit={handleSingleSubmit(onSingleSubmit)}
            className="flex flex-col flex-1 overflow-hidden min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Group Selection */}
              <div>
                <label
                  htmlFor="single_group_select"
                  className="block text-sm font-medium text-secondary-700 mb-1.5"
                >
                  Select Group <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="single_group_select"
                    value={selectedGroupId}
                    onChange={(e) => {
                      setSelectedGroupId(e.target.value);
                      setSingleValue('member_id', '');
                    }}
                    className="w-full h-11 min-h-[44px] px-3 py-2 bg-surface border border-border rounded-lg text-base sm:text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none truncate font-sans cursor-pointer pr-8"
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

              {/* Member Selection */}
              <div>
                <label
                  htmlFor="single_member_select"
                  className="block text-sm font-medium text-secondary-700 mb-1.5"
                >
                  Select Member <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="single_member_select"
                    {...register('member_id', { required: 'Please select a member' })}
                    className="w-full h-11 min-h-[44px] px-3 py-2 bg-surface border border-border rounded-lg text-base sm:text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none truncate font-sans cursor-pointer pr-8 disabled:bg-secondary-50 disabled:text-secondary-400 disabled:cursor-not-allowed"
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
                        {m.member_code ? `${m.member_code} — ` : ''}
                        {m.member_name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-secondary-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
                {singleErrors.member_id && (
                  <p className="mt-1 text-xs text-error-600">{singleErrors.member_id.message}</p>
                )}
              </div>

              {/* Read-Only Scheme Context */}
              {selectedSingleMember && (
                <div className="rounded-xl bg-secondary-50/80 p-3.5 border border-secondary-200/80 text-xs space-y-1.5 shadow-xs">
                  <div className="flex justify-between items-start gap-2 text-secondary-700">
                    <span className="font-medium flex-shrink-0">Member:</span>
                    <span className="font-semibold text-secondary-900 break-words text-right flex-1">
                      {selectedSingleMember.member_name}{' '}
                      {selectedSingleMember.member_code
                        ? `(${selectedSingleMember.member_code})`
                        : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2 text-secondary-700">
                    <span className="font-medium flex-shrink-0">Group:</span>
                    <span className="font-semibold text-secondary-900 break-words text-right flex-1">
                      {selectedSingleMember.group_name}{' '}
                      {selectedSingleMember.location ? `(${selectedSingleMember.location})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-secondary-700 pt-1 border-t border-secondary-200/60">
                    <span className="font-medium">Standard Installment:</span>
                    <span className="font-bold text-primary-700 text-sm font-mono">
                      {formatCurrency(
                        Number(selectedSingleMember.weekly_installment || groupDefaultWeekly)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-secondary-700">
                    <span className="font-medium">Weeks Paid:</span>
                    <span className="font-semibold text-secondary-900 font-mono">
                      {singlePaidWeeksCount}
                    </span>
                  </div>
                </div>
              )}

              {/* Week Number & Amount Paid Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    id="single-collection-week-number"
                    label="Week *"
                    type="number"
                    value={singleNextPayableWeek}
                    readOnly
                    disabled
                  />
                </div>

                <div>
                  <Input
                    id="single-collection-amount-paid"
                    label="Amount (₹) *"
                    type="number"
                    step="0.01"
                    min={1}
                    {...register('amount_paid', {
                      required: 'Amount is required',
                      min: { value: 1, message: 'Must be > 0' },
                      valueAsNumber: true,
                    })}
                    errorMessage={singleErrors.amount_paid?.message}
                    placeholder="₹ Amount"
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <Input
                  id="single-collection-payment-date"
                  label="Payment Date *"
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  {...register('payment_date', {
                    required: 'Payment date is required',
                  })}
                  errorMessage={singleErrors.payment_date?.message}
                />
              </div>

              {/* Remarks */}
              <div>
                <label
                  htmlFor="single-collection-remarks"
                  className="block text-sm font-medium text-secondary-700 mb-1.5"
                >
                  Remarks (Optional)
                </label>
                <textarea
                  id="single-collection-remarks"
                  rows={2}
                  {...register('remarks')}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base sm:text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-secondary-400"
                  placeholder="Optional collection notes..."
                />
              </div>
            </div>

            {/* Pinned Single Footer */}
            <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border bg-surface flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-md">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="min-h-[44px] px-4"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                disabled={!singleMemberId || isSubmitting}
                className="min-h-[44px] flex-1 sm:flex-initial px-5 font-semibold text-sm shadow-sm"
              >
                {selectedSingleMember
                  ? `${t('modal.submitPayment')} (Week ${singleNextPayableWeek})`
                  : t('modal.submitPayment')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
