/**
 * VEL Finance — Shared Zod Validation Schemas
 * ─────────────────────────────────────────────────────────────────────────────
 * Common validation schemas reused across feature forms.
 * Per 10_DEVELOPMENT_RULES.md: React Hook Form + Zod on frontend.
 *
 * Do NOT add business-specific validation here.
 * This file contains only common patterns (phone, UUID, dates, etc.).
 */
import { z } from 'zod';

// ── Common Field Schemas ──────────────────────────────────────────────────────

/**
 * Indian mobile phone number validation.
 * Accepts 10-digit numbers, optionally prefixed with +91 or 0.
 */
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(
    /^(\+91|0)?[6-9]\d{9}$/,
    'Enter a valid 10-digit Indian mobile number',
  );

/**
 * UUID v4 validation.
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid identifier format');

/**
 * ISO 8601 date string validation (YYYY-MM-DD).
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/**
 * Non-empty string that strips whitespace.
 */
export const requiredStringSchema = (fieldName: string) =>
  z
    .string()
    .min(1, `${fieldName} is required`)
    .transform((v) => v.trim());

/**
 * Positive integer.
 */
export const positiveIntSchema = z
  .number()
  .int('Must be a whole number')
  .positive('Must be a positive number');

/**
 * Positive number (allows decimals).
 */
export const positiveNumberSchema = z
  .number()
  .positive('Must be a positive number');

// ── Pagination Schema ─────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});
