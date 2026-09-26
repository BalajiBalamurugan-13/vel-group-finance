import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUpdateScheme } from '../hooks/useSchemes';
import type { SchemeUpdate, Scheme } from '../types';
import type { ApiError } from '@/types/common';

interface Props {
  scheme: Scheme | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateSchemeFormModal({ scheme, isOpen, onClose }: Props) {
  const { mutateAsync: updateScheme, isPending } = useUpdateScheme();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchemeUpdate>();

  useEffect(() => {
    if (scheme) {
      reset({
        scheme_name: scheme.scheme_name,
        description: scheme.description || '',
      });
    }
  }, [scheme, reset]);

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
      if (e.key === 'Escape' && !isPending) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPending]);

  if (!isOpen || !scheme) return null;

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: SchemeUpdate) => {
    setApiError(null);
    try {
      await updateScheme({ id: scheme.id, payload: data });
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || 'An error occurred while updating the scheme.');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-secondary-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) {
          handleClose();
        }
      }}
    >
      <div
        className="flex flex-col w-full sm:max-w-md max-h-[92vh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface shrink-0">
          <div>
            <h2 className="text-base font-bold text-secondary-900">
              Update Scheme
            </h2>
            <p className="text-xs text-secondary-500 mt-0.5">
              Edit scheme display name and description
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {apiError && (
              <div className="rounded-lg bg-error-50 p-3 text-sm text-error-600 border border-error-200">
                {apiError}
              </div>
            )}

            <Input
              id="update_scheme_name"
              label="Scheme Name *"
              {...register('scheme_name', { required: 'Scheme name is required', maxLength: 255 })}
              errorMessage={errors.scheme_name?.message}
            />
            <Input
              id="update_description"
              label="Description (Optional)"
              {...register('description')}
              errorMessage={errors.description?.message}
            />

            <div className="rounded-lg bg-secondary-50 p-3 text-xs text-secondary-600 border border-border">
              <strong>Note:</strong> Financial configurations (loan amount, weeks, etc.) cannot be modified to preserve historical records. Create a new scheme for different configurations.
            </div>
          </div>

          {/* Pinned Sticky Footer */}
          <div className="shrink-0 border-t border-border bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
