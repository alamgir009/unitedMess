const DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const AppError = require('../errors/AppError');

const parseDate = (dateInput) => {
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput !== 'string') {
        throw new AppError('Date must be a string or Date object', 400);
    }

    // 1. Check DD/MM/YYYY first (Priority)
    const match = dateInput.match(DATE_REGEX);
    if (match) {
        const [, day, month, year] = match;
        // Use Date.UTC to ensure it stays exactly on that day regardless of server timezone
        return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    }

    // 2. ISO format fallback (for YYYY-MM-DD)
    const iso = Date.parse(dateInput);
    if (!isNaN(iso)) {
        return new Date(iso);
    }

    throw new AppError('Invalid date format. Use DD/MM/YYYY or YYYY-MM-DD', 400);
};

/**
 * Normalize a Date to midnight UTC (00:00:00.000Z).
 *
 * IMPORTANT: Input Date objects MUST be UTC-based (constructed via Date.UTC()
 * or parseDate()). Locally-constructed Dates (e.g. new Date("Dec 25, 2026"))
 * will produce incorrect results because getUTCFullYear/getUTCMonth/getUTCDate
 * read the UTC representation of a local timestamp.
 *
 * All callers in this codebase pass UTC-based Dates (from parseDate or
 * Date.UTC), so this is safe. If you have a raw local-time Date, pass it
 * through parseDate() first.
 */
const normalizeToUTC = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    throw new AppError('Invalid date', 400);
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

/**
 * Convert any Date to a canonical 'YYYY-MM-DD' string using UTC components.
 * This is the single source of truth for date keys across the entire codebase.
 * Use this instead of toISOString().split('T')[0] or date-fns format().
 *
 * IMPORTANT: Input Date MUST be UTC-based (see normalizeToUTC docs).
 */
const toDateKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    throw new AppError('Invalid date', 400);
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Calculates the active billing month and year based on the 10th-day rule.
 * Days 1-10: Previous month is active.
 * Days 11+: Current month is active.
 *
 * FIX: Uses normalizeToUTC for all date comparisons — eliminates timezone
 * boundary shift. Uses Intl.DateTimeFormat with explicit 'en-US' locale to
 * prevent month-name mismatch when server locale is non-English.
 *
 * Source of truth: shared/utils/billingPeriod.js
 */
const getBillingPeriod = (date = new Date()) => {
    const utc = normalizeToUTC(date);
    const day = utc.getUTCDate();
    let month = utc.getUTCMonth() + 1;
    let year = utc.getUTCFullYear();

    if (day <= 10) {
        if (month === 1) {
            month = 12;
            year--;
        } else {
            month--;
        }
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const monthName = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));

    return { month, year, start, end, monthName };
};

/**
 * Calculates the dynamic system-wide start date constraint for active view based on the 10th-day rule. 
 */
const getVisibleBillingStartDate = () => {
    const { start } = getBillingPeriod();
    return start;
};

/**
 * FIX: Returns the most-recently-finalized billing period.
 * Used by getAdminUnpaidInvoices so that on day 11+ the admin sees
 * the just-finalized month's unpaid bills (not the empty current month).
 *
 * Rule: If today is day 1-10 of month M, last finalized = M-2.
 *       If today is day 11+ of month M, last finalized = M-1.
 */
const getLastFinalizedPeriod = (date = new Date()) => {
    const utc = normalizeToUTC(date);
    const day = utc.getUTCDate();
    let month, year;

    if (day <= 10) {
        const bp = getBillingPeriod(date);
        month = bp.month - 1;
        year = bp.year;
        if (month <= 0) { month += 12; year--; }
    } else {
        month = utc.getUTCMonth();
        year = utc.getUTCFullYear();
        if (month === 0) { month = 12; year--; }
    }

    const monthName = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));

    return { month, year, monthName };
};

/**
 * Normalize a Date to midnight UTC (00:00:00.000Z).
 * Delegates to normalizeToUTC for consistent UTC handling.
 */
const normalizeDate = (date) => normalizeToUTC(date);

module.exports = {
  parseDate,
  normalizeDate,
  normalizeToUTC,
  toDateKey,
  getVisibleBillingStartDate,
  getBillingPeriod,
  getLastFinalizedPeriod,
};