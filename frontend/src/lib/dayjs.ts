/**
 * VEL Finance — Day.js Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Day.js setup with required plugins.
 *
 * Always import dayjs from this file, not directly from 'dayjs'.
 * This ensures plugins are registered before use.
 *
 * Usage:
 *   import { dayjs } from '@/lib/dayjs';
 *   dayjs('2026-01-01').format('DD MMM YYYY')
 */
import dayjsBase from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';
import weekday from 'dayjs/plugin/weekday';

// Register all plugins
dayjsBase.extend(relativeTime);
dayjsBase.extend(customParseFormat);
dayjsBase.extend(localizedFormat);
dayjsBase.extend(isSameOrBefore);
dayjsBase.extend(isSameOrAfter);
dayjsBase.extend(isBetween);
dayjsBase.extend(utc);
dayjsBase.extend(timezone);
dayjsBase.extend(duration);
dayjsBase.extend(weekday);

export const dayjs = dayjsBase;
export default dayjsBase;
