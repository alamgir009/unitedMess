const { normalizeToUTC } = require('../helpers/date.helper');

const MAX_CONSECUTIVE_DAYS = 2;
const MIN_WEEKDAYS_PER_MONTH = 1;

/**
 * Get ISO-8601 week number for a UTC date.
 * Week starts on Monday. Week 1 contains Jan 4.
 */
const getISOWeek = (date) => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayOfWeek = d.getUTCDay() || 7; // Mon=1 .. Sun=7
    d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

/**
 * Get ISO week key: "YYYY-Wxx"
 */
const getWeekKey = (date) => {
    return `${date.getUTCFullYear()}-W${String(getISOWeek(date)).padStart(2, '0')}`;
};

/**
 * Validate a member's monthly market-schedule date selection.
 *
 * Rules enforced:
 *   R1 — WEEKEND_ONLY_NOT_ALLOWED: at least 1 weekday (Mon–Fri) required
 *   R2 — CONSECUTIVE_DAY_LIMIT_EXCEEDED: max 2 consecutive days per ISO week
 *   Hygiene — EMPTY_SELECTION, PAST_DATE_NOT_ALLOWED
 *
 * Duplicate dates are silently deduplicated (not an error).
 *
 * @param {Array<Date|string>} dates - Array of Date objects or ISO date strings
 * @param {string} memberId - The member's user ID (for context, not used in pure validation)
 * @param {{ year: number, month: number }} monthContext - Target month/year
 * @returns {{ valid: boolean, errorCode?: string, details?: string }}
 */
const validateMarketSchedule = (dates, memberId, monthContext) => {
    // ── Hygiene: empty / non-array ────────────────────────────────────
    if (!Array.isArray(dates) || dates.length === 0) {
        return { valid: false, errorCode: 'EMPTY_SELECTION', details: 'At least one date is required' };
    }

    // ── Normalize + deduplicate ───────────────────────────────────────
    const seen = new Set();
    const normalized = [];
    for (const raw of dates) {
        let d;
        try {
            d = normalizeToUTC(raw instanceof Date ? raw : new Date(raw));
        } catch {
            return { valid: false, errorCode: 'INVALID_DATE', details: `Invalid date: ${raw}` };
        }
        const key = d.toISOString().split('T')[0];
        if (!seen.has(key)) {
            seen.add(key);
            normalized.push(d);
        }
    }

    // ── Hygiene: past dates ───────────────────────────────────────────
    const today = normalizeToUTC(new Date());
    for (const d of normalized) {
        if (d < today) {
            return {
                valid: false,
                errorCode: 'PAST_DATE_NOT_ALLOWED',
                details: `Date ${d.toISOString().split('T')[0]} is in the past`,
            };
        }
    }

    // ── R1: weekend-only check ────────────────────────────────────────
    let weekdayCount = 0;
    for (const d of normalized) {
        const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon .. 5=Fri, 6=Sat
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            weekdayCount++;
        }
    }
    if (weekdayCount < MIN_WEEKDAYS_PER_MONTH) {
        return {
            valid: false,
            errorCode: 'WEEKEND_ONLY_NOT_ALLOWED',
            details: `Selection must include at least ${MIN_WEEKDAYS_PER_MONTH} weekday (Mon–Fri)`,
        };
    }

    // ── R2: consecutive-day cap per ISO week ──────────────────────────
    // Group dates by ISO week
    const weekGroups = new Map();
    for (const d of normalized) {
        const wk = getWeekKey(d);
        if (!weekGroups.has(wk)) weekGroups.set(wk, []);
        weekGroups.get(wk).push(d);
    }

    for (const [wk, weekDates] of weekGroups) {
        weekDates.sort((a, b) => a - b);

        let runLength = 1;
        for (let i = 1; i < weekDates.length; i++) {
            const diffMs = weekDates[i] - weekDates[i - 1];
            const diffDays = diffMs / 86400000;
            if (diffDays === 1) {
                runLength++;
                if (runLength > MAX_CONSECUTIVE_DAYS) {
                    return {
                        valid: false,
                        errorCode: 'CONSECUTIVE_DAY_LIMIT_EXCEEDED',
                        details: `${runLength} consecutive days in week ${wk} exceeds max of ${MAX_CONSECUTIVE_DAYS}`,
                    };
                }
            } else {
                runLength = 1;
            }
        }
    }

    return { valid: true };
};

module.exports = {
    validateMarketSchedule,
    MAX_CONSECUTIVE_DAYS,
    MIN_WEEKDAYS_PER_MONTH,
};
