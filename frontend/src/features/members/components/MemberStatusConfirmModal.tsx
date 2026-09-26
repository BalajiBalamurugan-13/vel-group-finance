import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import type { Member, MemberStatus } from '../types';
import type { ApiError } from '@/types/common';
import { AlertCircle } from 'lucide-react';

interface MemberStatusConfirmModalProps {
  member: Member | null;
  targetStatus: MemberStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (member: Member, targetStatus: MemberStatus) => Promise<void>;
  isLoading?: boolean;
}

export function MemberStatusConfirmModal({
  member,
  targetStatus,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: MemberStatusConfirmModalProps) {
  const [apiError, setApiError] = useState<string | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !member || !targetStatus) return null;

  const handleConfirm = async () => {
    setApiError(null);
    try {
      await onConfirm(member, targetStatus);
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(
        apiErr.message ||
          `Failed to update member status to '${targetStatus}'.`,
      );
    }
  };

  const getStatusMessage = () => {
    switch (targetStatus) {
      case 'Completed':
        return `Are you sure you want to mark '${member.member_name}' as Completed? This indicates all weekly installments for this loan cycle are finished.`;
      case 'Closed':
        return `Are you sure you want to close '${member.member_name}'? Closed is a terminal state; historical records are permanently preserved.`;
      case 'Active':
        return `Are you sure you want to set '${member.member_name}' status to Active?`;
      default:
        return `Are you sure you want to change '${member.member_name}' status from '${member.status}' to '${targetStatus}'?`;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-xl bg-surface p-5 sm:p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-50 text-warning-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-secondary-900">
              Confirm Status Change
            </h3>
            <p className="mt-2 text-sm text-secondary-600 leading-relaxed">
              {getStatusMessage()}
            </p>
          </div>
        </div>

        {apiError && (
          <div className="mt-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 border border-error-200">
            {apiError}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            Confirm {targetStatus}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
