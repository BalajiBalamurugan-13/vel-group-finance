/**
 * VEL Finance — Format Utilities
 * ─────────────────────────────────────────────────────────────────────────────
 * Display formatting utilities for the UI layer.
 *
 * IMPORTANT (per 10_DEVELOPMENT_RULES.md):
 * - These functions format values FOR DISPLAY only.
 * - They do NOT perform business calculations.
 * - All financial calculations happen on the backend.
 * - Never use these to compute financial totals or derived values.
 */
import { dayjs } from '@/lib/dayjs';

// ── Currency ──────────────────────────────────────────────────────────────────

/**
 * Formats a numeric amount for display.
 * Uses Indian locale formatting (₹ symbol, lakh/crore grouping).
 *
 * @example formatCurrency(125000) → "₹1,25,000"
 */
export function formatCurrency(
  amount: number,
  options: {
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  } = {},
): string {
  const {
    currency = 'INR',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    compact = false,
  } = options;

  if (!isFinite(amount)) return '—';

  if (compact) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Formats a number with Indian locale grouping (no currency symbol).
 * @example formatNumber(125000) → "1,25,000"
 */
export function formatNumber(
  value: number,
  options: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {},
): string {
  if (!isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(value);
}

// ── Date ──────────────────────────────────────────────────────────────────────

/**
 * Formats an ISO date string for display.
 * @example formatDate('2026-08-06') → "06 Aug 2026"
 */
export function formatDate(
  dateString: string | null | undefined,
  format = 'DD MMM YYYY',
): string {
  if (!dateString) return '—';
  const parsed = dayjs(dateString);
  if (!parsed.isValid()) return '—';
  return parsed.format(format);
}

/**
 * Formats a date as relative time.
 * @example formatRelativeTime('2026-08-05') → "a day ago"
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const parsed = dayjs(dateString);
  if (!parsed.isValid()) return '—';
  return parsed.fromNow();
}

/**
 * Formats a date for display in table headers.
 * @example formatShortDate('2026-08-06') → "06 Aug"
 */
export function formatShortDate(dateString: string | null | undefined): string {
  return formatDate(dateString, 'DD MMM');
}

// ── String ────────────────────────────────────────────────────────────────────

/**
 * Truncates a string to a maximum length with an ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalizes the first letter of each word.
 */
export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats a phone number for display.
 * @example formatPhone('9876543210') → "+91 98765 43210"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}
