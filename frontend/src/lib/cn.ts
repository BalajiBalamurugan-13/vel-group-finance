/**
 * VEL Finance — className utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Combines clsx (conditional class merging) with tailwind-merge
 * (resolves Tailwind class conflicts intelligently).
 *
 * Usage:
 *   cn('px-4 py-2', isActive && 'bg-primary-500', className)
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
