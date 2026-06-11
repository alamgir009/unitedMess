/**
 * shared/utils/billingPeriod.js
 *
 * SINGLE SOURCE OF TRUTH for billing period calculation.
 * Both frontend and backend should derive their logic from this.
 *
 * Uses UTC-normalized dates and explicit 'en-US' locale to eliminate
 * timezone and locale-dependent data corruption.
 */

const MS_PER_DAY = 86400000;

/**
 * Normalize a Date to midnight UTC (00:00:00.000Z).
 * FIX: Uses getUTCFullYear/getUTCMonth/getUTCDate — always UTC,
 * no local-timezone inconsistency. Previously getDate() varied
 * by server/browser timezone.
 */
export function normalizeToUTC(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) throw new Error('Invalid date');
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Calculates the active billing month and year based on the 10th-day rule.
 * Days 1-10: Previous month is active.
 * Days 11+: Current month is active.
 *
 * All dates are normalized to UTC before comparison.
 * Month names use 'en-US' locale — invariant regardless of server locale.
 */
export function getBillingPeriod(date = new Date()) {
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

  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return { month, year, monthName, start, end };
}

/**
 * Returns the most-recently-finalized billing period.
 * This is the period that SHOULD be shown in the "Unresolved Bills" panel.
 *
 * Rule: If today is day 1-10 of month M, the most recently finalized
 * period is M-2 (two months ago). If today is day 11+, the most recently
 * finalized period is M-1 (last month).
 *
 * The cron finalizes month M-1's invoices on the 11th of month M.
 */
export function getLastFinalizedPeriod(date = new Date()) {
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
}
