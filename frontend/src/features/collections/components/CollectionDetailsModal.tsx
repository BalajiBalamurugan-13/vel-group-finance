import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  User,
  Users,
  Receipt,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/utils/format';
import { CollectionStatusBadge } from './CollectionStatusBadge';
import { useUpdateCollection, useDeleteCollection } from '../hooks/useCollections';
import { useLanguage } from '@/i18n';
import type { Collection, PaymentStatus } from '../types';
import type { ApiError } from '@/types/common';
import { cn } from '@/lib/cn';

interface CollectionDetailsModalProps {
  collection: Collection | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  initialMode?: 'view' | 'edit';
}

export function CollectionDetailsModal({
  collection,
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'view',
}: CollectionDetailsModalProps) {
  const { language } = useLanguage();
  const { mutateAsync: updateCollection, isPending: isUpdating } = useUpdateCollection();
  const { mutateAsync: deleteCollection, isPending: isDeleting } = useDeleteCollection();

  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Form edit fields
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [remarks, setRemarks] = useState<string>('');

  // Sync state when collection changes or modal opens
  useEffect(() => {
    if (collection) {
      setAmountPaid(String(collection.amount_paid));
      setPaymentDate(collection.payment_date ? collection.payment_date.slice(0, 10) : '');
      setWeekNumber(collection.week_number || 1);
      setPaymentStatus(collection.payment_status || 'Paid');
      setRemarks(collection.remarks || '');
      setIsEditing(initialMode === 'edit');
      setShowDeleteConfirm(false);
      setApiError(null);
    }
  }, [collection, initialMode, isOpen]);

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

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, showDeleteConfirm, onClose]);

  if (!isOpen || !collection) return null;

  const amount = Number(collection.amount_paid);
  const outstanding = Number(collection.outstanding_amount || 0);
  const weeklyInst = Number(collection.weekly_installment || 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const numAmount = Number(amountPaid);
    if (!amountPaid || isNaN(numAmount) || numAmount <= 0) {
      setApiError(language === 'ta' ? 'செல்லுபடியாகும் தொகையை உள்ளிடவும் (> 0)' : 'Please enter a valid amount (> 0)');
      return;
    }
    if (!paymentDate) {
      setApiError(language === 'ta' ? 'தேதியை தேர்ந்தெடுக்கவும்' : 'Please select payment date');
      return;
    }
    if (weekNumber < 1) {
      setApiError(language === 'ta' ? 'வாரம் எண் 1 அல்லது அதற்கு மேல் இருக்க வேண்டும்' : 'Week number must be >= 1');
      return;
    }

    try {
      await updateCollection({
        id: collection.id,
        payload: {
          amount_paid: numAmount,
          payment_date: paymentDate,
          week_number: weekNumber,
          payment_status: paymentStatus,
          remarks: remarks.trim() || undefined,
        },
      });

      // Update current collection fields locally for immediate feedback
      collection.amount_paid = numAmount;
      collection.payment_date = paymentDate;
      collection.week_number = weekNumber;
      collection.payment_status = paymentStatus;
      collection.remarks = remarks.trim() || undefined;

      setIsEditing(false);
      onSuccess?.(
        language === 'ta'
          ? 'வசூல் விவரங்கள் வெற்றிகரமாக திருத்தப்பட்டன.'
          : 'Collection details updated successfully.'
      );
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || 'Failed to update collection');
    }
  };

  const handleDelete = async () => {
    setApiError(null);
    try {
      await deleteCollection(collection.id);
      onSuccess?.(
        language === 'ta'
          ? 'வசூல் பதிவு நீக்கப்பட்டது. நிலுவை கணக்கிடப்பட்டது.'
          : 'Collection record deleted. Outstanding balance recalculated.'
      );
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || 'Failed to delete collection');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-secondary-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-details-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUpdating && !isDeleting) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border border-border max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Pinned Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 flex-shrink-0 bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="collection-details-title"
                className="text-base sm:text-lg font-bold text-secondary-900"
              >
                {isEditing
                  ? language === 'ta'
                    ? 'வசூல் விவரங்களைத் திருத்து'
                    : 'Edit Collection Record'
                  : language === 'ta'
                  ? 'வசூல் விவரங்கள்'
                  : 'Collection Details'}
              </h2>
              <p className="text-xs text-secondary-500">
                {collection.member_name} · {collection.group_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating || isDeleting}
            className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {apiError && (
            <div className="rounded-lg bg-error-50 p-3 text-sm text-error-700 border border-error-200">
              {apiError}
            </div>
          )}

          {/* Delete Confirmation Box */}
          {showDeleteConfirm && (
            <div className="rounded-xl border border-error-300 bg-error-50/80 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-error-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-error-900">
                    {language === 'ta' ? 'வசூல் பதிவை நீக்க வேண்டுமா?' : 'Delete Collection Record?'}
                  </h4>
                  <p className="text-xs text-error-700 mt-1">
                    {language === 'ta'
                      ? 'இந்த பதிவை நீக்கினால், உறுப்பினரின் செலுத்திய வாரங்கள் மற்றும் நிலுவைத் தொகை மீண்டும் பழைய நிலைக்குத் திரும்பும்.'
                      : 'Deleting this will remove the payment and recalculate the member’s weeks paid and outstanding balance.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  {language === 'ta' ? 'ரத்து' : 'Cancel'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-error-600 hover:bg-error-700 text-white"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                >
                  {language === 'ta' ? 'ஆம், நீக்கு' : 'Yes, Delete'}
                </Button>
              </div>
            </div>
          )}

          {isEditing ? (
            /* ── EDIT FORM ────────────────────────────────────────────── */
            <form id="edit-collection-form" onSubmit={handleSave} className="space-y-4">
              <div className="p-3 rounded-xl bg-secondary-50/80 border border-border text-xs text-secondary-600 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-secondary-900">{collection.member_name}</span>
                  <span className="text-secondary-400 mx-1.5">•</span>
                  <span>{collection.group_name}</span>
                </div>
                {collection.receipt_code && (
                  <span className="font-mono font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                    {collection.receipt_code}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="edit_amount_paid"
                  label={language === 'ta' ? 'செலுத்திய தொகை (₹) *' : 'Amount Paid (₹) *'}
                  type="number"
                  step="1"
                  min="1"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="e.g. 760"
                  required
                />

                <Input
                  id="edit_payment_date"
                  label={language === 'ta' ? 'செலுத்திய தேதி *' : 'Payment Date *'}
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit_week_number"
                    className="text-sm font-medium text-secondary-700 block mb-1.5"
                  >
                    {language === 'ta' ? 'வாரம் எண் *' : 'Week Number *'}
                  </label>
                  <input
                    id="edit_week_number"
                    type="number"
                    min="1"
                    max={collection.total_weeks || 52}
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    required
                    className={cn(
                      'h-11 min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 text-sm text-secondary-900',
                      'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                    )}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit_payment_status"
                    className="text-sm font-medium text-secondary-700 block mb-1.5"
                  >
                    {language === 'ta' ? 'கட்டண நிலை' : 'Payment Status'}
                  </label>
                  <select
                    id="edit_payment_status"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className={cn(
                      'h-11 min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 text-sm text-secondary-900',
                      'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                    )}
                  >
                    <option value="Paid">Paid (செலுத்தப்பட்டது)</option>
                    <option value="Partial">Partial (பகுதி)</option>
                    <option value="Pending">Pending (நிலுவை)</option>
                    <option value="Waived">Waived (தள்ளுபடி)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="edit_remarks"
                  className="text-sm font-medium text-secondary-700"
                >
                  {language === 'ta' ? 'குறிப்புகள் (விருப்பத்தேர்வு)' : 'Remarks (Optional)'}
                </label>
                <textarea
                  id="edit_remarks"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={language === 'ta' ? 'திருத்தம் பற்றிய குறிப்பு...' : 'Note on correction...'}
                  className={cn(
                    'w-full rounded-lg border border-border bg-surface p-3 text-sm text-secondary-900 placeholder:text-secondary-400',
                    'hover:border-border-strong focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                  )}
                />
              </div>
            </form>
          ) : (
            /* ── VIEW MODE ────────────────────────────────────────────── */
            <>
              {/* Main Transaction Highlight Card */}
              <div className="rounded-xl bg-primary-50/70 p-4 border border-primary-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-primary-800 uppercase tracking-wider">
                    {language === 'ta' ? 'வசூலித்த தொகை' : 'Collected Amount'}
                  </span>
                  <div className="text-2xl font-black text-primary-900 mt-0.5 font-mono">
                    {formatCurrency(amount)}
                  </div>
                </div>
                <div className="text-right">
                  <CollectionStatusBadge status={collection.payment_status} />
                  <div className="text-xs text-primary-700 font-medium mt-1.5 font-mono">
                    {language === 'ta' ? 'வாரம்' : 'Week'} {collection.week_number}
                    {collection.total_weeks ? ` / ${collection.total_weeks}` : ''}
                  </div>
                </div>
              </div>

              {/* Member & Group Info */}
              <div className="rounded-xl border border-border p-4 bg-secondary-50/50 space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-secondary-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-secondary-500 block">
                      {language === 'ta' ? 'உறுப்பினர்' : 'Member'}
                    </span>
                    <span className="font-semibold text-secondary-900 text-sm">
                      {collection.member_name || '—'}
                    </span>
                    {collection.phone_number && (
                      <span className="text-xs text-secondary-500 block font-mono">
                        {collection.phone_number}
                      </span>
                    )}
                  </div>
                  {collection.receipt_code && (
                    <span className="font-mono font-semibold text-xs text-success-700 bg-success-50 border border-success-200 px-2 py-0.5 rounded">
                      {collection.receipt_code}
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-border/50">
                  <Users className="w-4 h-4 text-secondary-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-secondary-500 block">
                      {language === 'ta' ? 'குழு / இடம்' : 'Group / Location'}
                    </span>
                    <span className="font-semibold text-secondary-900 text-sm">
                      {collection.group_name || '—'}
                    </span>
                    {collection.location && (
                      <span className="text-xs text-secondary-500 block">
                        {collection.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-border/50">
                  <Calendar className="w-4 h-4 text-secondary-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-secondary-500 block">
                      {language === 'ta' ? 'தேதி & வசூலிப்பாளர்' : 'Payment Date & Collector'}
                    </span>
                    <span className="font-medium text-secondary-900 text-sm font-mono">
                      {formatDate(collection.payment_date)}
                    </span>
                    <span className="text-xs text-secondary-500 block">
                      {language === 'ta' ? 'பெற்றவர்:' : 'Received by:'} {collection.collector_name || 'Admin'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Outstanding & Loan Cycle Financial Metrics */}
              {weeklyInst > 0 && (
                <div className="rounded-xl border border-border p-4 bg-surface space-y-2.5">
                  <h3 className="text-xs font-bold text-secondary-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success-600" />
                    {language === 'ta' ? 'சுழற்சி நிதி நிலை' : 'Cycle Financial Status'}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-secondary-500 block">
                        {language === 'ta' ? 'நிலையான தவணை' : 'Standard Installment'}
                      </span>
                      <span className="font-semibold text-secondary-900 font-mono">
                        {formatCurrency(weeklyInst)}
                      </span>
                    </div>
                    <div>
                      <span className="text-secondary-500 block">
                        {language === 'ta' ? 'செலுத்திய வாரங்கள்' : 'Weeks Paid'}
                      </span>
                      <span className="font-semibold text-secondary-900 font-mono">
                        {collection.weeks_paid ?? collection.week_number} /{' '}
                        {collection.total_weeks || 18}
                      </span>
                    </div>
                    <div>
                      <span className="text-secondary-500 block">
                        {language === 'ta' ? 'மீதமுள்ள வாரங்கள்' : 'Remaining Weeks'}
                      </span>
                      <span className="font-semibold text-secondary-900 font-mono">
                        {collection.remaining_installments ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-secondary-500 block">
                        {language === 'ta' ? 'தற்போதைய நிலுவை' : 'Current Outstanding'}
                      </span>
                      <span className="font-bold text-secondary-900 font-mono">
                        {formatCurrency(outstanding)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks */}
              {collection.remarks && (
                <div className="rounded-xl border border-border p-3.5 bg-secondary-50/30 text-xs">
                  <span className="font-semibold text-secondary-700 block mb-1">
                    {language === 'ta' ? 'குறிப்புகள்' : 'Remarks'}
                  </span>
                  <p className="text-secondary-600 italic">{collection.remarks}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pinned Footer with safe-area spacing */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border bg-surface flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={isUpdating}
                className="min-h-[44px] px-4"
              >
                {language === 'ta' ? 'ரத்து' : 'Cancel'}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isUpdating || showDeleteConfirm}
                  className="min-h-[44px] px-3 text-error-600 border-error-200 hover:bg-error-50"
                  title="Delete Record"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  type="submit"
                  form="edit-collection-form"
                  variant="primary"
                  isLoading={isUpdating}
                  className="min-h-[44px] px-6 font-semibold"
                >
                  {language === 'ta' ? 'மாற்றங்களை சேமி' : 'Save Changes'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="min-h-[44px] px-3.5 text-secondary-700 hover:text-primary-700 hover:border-primary-300"
                  leftIcon={<Pencil className="w-4 h-4" />}
                >
                  {language === 'ta' ? 'திருத்து' : 'Edit Payment'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="min-h-[44px] px-3 text-error-600 hover:bg-error-50"
                  title="Delete Record"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={onClose}
                className="min-h-[44px] px-6"
              >
                {language === 'ta' ? 'மூடு' : 'Close'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
