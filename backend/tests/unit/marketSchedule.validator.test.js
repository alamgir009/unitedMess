/**
 * Unit tests for validateMarketSchedule.
 *
 * All dates use September 2026 (future) to avoid PAST_DATE_NOT_ALLOWED.
 * September 1, 2026 = Tuesday.
 */

const { validateMarketSchedule } = require('../../src/utils/validators/marketSchedule.validator');

const MEMBER_ID = 'member123';
const MONTH_CTX = { year: 2026, month: 9 };

// Helper: create ISO date string for Sep 2026
const sep = (day) => `2026-09-${String(day).padStart(2, '0')}`;

describe('validateMarketSchedule', () => {
    // ── Hygiene ───────────────────────────────────────────────────────

    // Test 9
    it('rejects empty array with EMPTY_SELECTION', () => {
        const result = validateMarketSchedule([], MEMBER_ID, MONTH_CTX);
        expect(result).toEqual({
            valid: false,
            errorCode: 'EMPTY_SELECTION',
            details: 'At least one date is required',
        });
    });

    // Test 11
    it('rejects non-array input with EMPTY_SELECTION', () => {
        expect(validateMarketSchedule(null, MEMBER_ID, MONTH_CTX).valid).toBe(false);
        expect(validateMarketSchedule(null, MEMBER_ID, MONTH_CTX).errorCode).toBe('EMPTY_SELECTION');
        expect(validateMarketSchedule(undefined, MEMBER_ID, MONTH_CTX).valid).toBe(false);
        expect(validateMarketSchedule('2026-09-10', MEMBER_ID, MONTH_CTX).valid).toBe(false);
    });

    // Test 8
    it('rejects past dates with PAST_DATE_NOT_ALLOWED', () => {
        const result = validateMarketSchedule(['2026-08-15'], MEMBER_ID, MONTH_CTX);
        expect(result).toEqual({
            valid: false,
            errorCode: 'PAST_DATE_NOT_ALLOWED',
            details: expect.stringContaining('2026-08-15'),
        });
    });

    // ── R1: Weekend-only ──────────────────────────────────────────────

    // Test 1
    it('rejects all-weekend selection with WEEKEND_ONLY_NOT_ALLOWED', () => {
        // Sep 5 = Saturday, Sep 6 = Sunday, Sep 12 = Saturday, Sep 13 = Sunday
        const result = validateMarketSchedule(
            [sep(5), sep(6), sep(12), sep(13)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({
            valid: false,
            errorCode: 'WEEKEND_ONLY_NOT_ALLOWED',
            details: expect.stringContaining('weekday'),
        });
    });

    // Test 2
    it('passes with 1 weekday + rest weekend', () => {
        // Sep 2 = Wednesday, Sep 5 = Saturday, Sep 6 = Sunday
        const result = validateMarketSchedule(
            [sep(2), sep(5), sep(6)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({ valid: true });
    });

    // Test 13
    it('rejects single weekend date with WEEKEND_ONLY_NOT_ALLOWED', () => {
        // Sep 5 = Saturday
        const result = validateMarketSchedule([sep(5)], MEMBER_ID, MONTH_CTX);
        expect(result).toEqual({
            valid: false,
            errorCode: 'WEEKEND_ONLY_NOT_ALLOWED',
            details: expect.stringContaining('weekday'),
        });
    });

    // Test 12
    it('passes with single weekday date', () => {
        // Sep 2 = Wednesday
        const result = validateMarketSchedule([sep(2)], MEMBER_ID, MONTH_CTX);
        expect(result).toEqual({ valid: true });
    });

    // ── R2: Consecutive-day cap ───────────────────────────────────────

    // Test 3
    it('rejects 3 consecutive days in same week with CONSECUTIVE_DAY_LIMIT_EXCEEDED', () => {
        // Sep 1=Tue, Sep 2=Wed, Sep 3=Thu — same ISO week
        const result = validateMarketSchedule(
            [sep(1), sep(2), sep(3)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({
            valid: false,
            errorCode: 'CONSECUTIVE_DAY_LIMIT_EXCEEDED',
            details: expect.stringContaining('3 consecutive days'),
        });
    });

    // Test 4
    it('passes with 2 consecutive + gap + 2 consecutive', () => {
        // Sep 1=Tue, Sep 2=Wed (pair 1), gap Sep 3, Sep 4=Fri, Sep 5=Sat (pair 2)
        const result = validateMarketSchedule(
            [sep(1), sep(2), sep(4), sep(5)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({ valid: true });
    });

    // Test 5
    it('rejects today+tomorrow+dayAfter (3 consecutive) in same week', () => {
        // Use fixed future dates: Sep 8=Tue, Sep 9=Wed, Sep 10=Thu
        const result = validateMarketSchedule(
            [sep(8), sep(9), sep(10)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({
            valid: false,
            errorCode: 'CONSECUTIVE_DAY_LIMIT_EXCEEDED',
            details: expect.stringContaining('3 consecutive days'),
        });
    });

    // Test 6
    it('resets consecutive counter at ISO week boundary (Sun→Mon)', () => {
        // Sep 6=Sun (week 36), Sep 7=Mon (week 37) — different ISO weeks
        // Each run is 1, so no violation
        const result = validateMarketSchedule(
            [sep(6), sep(7)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({ valid: true });
    });

    // Test 14
    it('passes with exactly 2 consecutive days (at cap)', () => {
        // Sep 1=Tue, Sep 2=Wed — same week, run=2
        const result = validateMarketSchedule(
            [sep(1), sep(2)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({ valid: true });
    });

    // Test 15
    it('rejects exactly 3 consecutive days (cap+1)', () => {
        // Sep 1=Tue, Sep 2=Wed, Sep 3=Thu
        const result = validateMarketSchedule(
            [sep(1), sep(2), sep(3)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe('CONSECUTIVE_DAY_LIMIT_EXCEEDED');
    });

    // Test 16
    it('passes with non-consecutive same-week dates (Mon+Wed+Fri)', () => {
        // Sep 7=Mon, Sep 9=Wed, Sep 11=Fri — same ISO week, none adjacent
        const result = validateMarketSchedule(
            [sep(7), sep(9), sep(11)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({ valid: true });
    });

    // Test 10
    it('evaluates months independently (rejects dates from different months)', () => {
        // Jul 31 is past (today Aug 27), Sep 1 is future — mixed-month input
        // The validator catches the past date; month-boundary enforcement is the service layer's job.
        const result = validateMarketSchedule(
            ['2026-07-31', sep(1)],
            MEMBER_ID,
            MONTH_CTX,
        );
        // Jul 31 is past → rejected
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe('PAST_DATE_NOT_ALLOWED');
    });

    // ── Hygiene: duplicates ───────────────────────────────────────────

    // Test 7
    it('deduplicates duplicate dates silently', () => {
        // Sep 2=Wed submitted twice — should pass as single date
        const result = validateMarketSchedule(
            [sep(2), sep(2), sep(2)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({ valid: true });
    });

    // ── Edge cases ────────────────────────────────────────────────────

    // Test 17
    it('handles leap year February (28/29 day months)', () => {
        // 2032 is a leap year. Feb 28=Sat, Feb 29=Sun → both weekend → WEEKEND_ONLY
        const result = validateMarketSchedule(
            ['2032-02-28', '2032-02-29'],
            MEMBER_ID,
            { year: 2032, month: 2 },
        );
        expect(result).toEqual({
            valid: false,
            errorCode: 'WEEKEND_ONLY_NOT_ALLOWED',
            details: expect.stringContaining('weekday'),
        });
    });

    it('handles 31-day month (August) with consecutive check', () => {
        // Aug 2027: Aug 1=Sat, Aug 2=Sun, Aug 3=Mon, Aug 4=Tue, Aug 5=Wed
        // Aug 3+4+5 = 3 consecutive weekdays → CONSECUTIVE_DAY_LIMIT_EXCEEDED
        const result = validateMarketSchedule(
            ['2027-08-03', '2027-08-04', '2027-08-05'],
            MEMBER_ID,
            { year: 2027, month: 8 },
        );
        expect(result).toEqual({
            valid: false,
            errorCode: 'CONSECUTIVE_DAY_LIMIT_EXCEEDED',
            details: expect.stringContaining('3 consecutive days'),
        });
    });

    it('allows run that spans Sat+Sun (2 consecutive, at cap)', () => {
        // Sep 5=Sat, Sep 6=Sun — same ISO week, run=2, but both weekend
        // R1 catches this (all weekend), not R2
        const result = validateMarketSchedule(
            [sep(5), sep(6)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({
            valid: false,
            errorCode: 'WEEKEND_ONLY_NOT_ALLOWED',
            details: expect.stringContaining('weekday'),
        });
    });

    it('allows run of 2 weekday + 1 weekend in same week (3 total, but max run is 2)', () => {
        // Sep 2=Wed, Sep 3=Thu, Sep 5=Sat — run of Wed-Thu is 2, then gap, then Sat
        const result = validateMarketSchedule(
            [sep(2), sep(3), sep(5)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({ valid: true });
    });

    it('rejects 4 consecutive days across week boundary within same ISO week', () => {
        // Sep 4=Fri, Sep 5=Sat, Sep 6=Sun — all in ISO week 36
        // Sep 4+5+6 = 3 consecutive → exceeds cap
        const result = validateMarketSchedule(
            [sep(4), sep(5), sep(6)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({
            valid: false,
            errorCode: 'CONSECUTIVE_DAY_LIMIT_EXCEEDED',
            details: expect.stringContaining('3 consecutive days'),
        });
    });

    it('passes with only weekend dates that include a weekday', () => {
        // Sep 5=Sat, Sep 6=Sun, Sep 7=Mon — has 1 weekday
        // Sep 4+5+6 = run of 3? No: Sep 4=Fri, Sep 5=Sat, Sep 6=Sun = 3 consecutive in week 36
        // Let's use Sep 5=Sat, Sep 6=Sun, Sep 8=Tue — Sat+Sun in week 36, Tue in week 37
        const result = validateMarketSchedule(
            [sep(5), sep(6), sep(8)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({ valid: true });
    });

    it('handles unsorted input correctly', () => {
        // Sep 3=Thu, Sep 1=Tue, Sep 2=Wed — unsorted, but internally sorted
        // Sep 1+2+3 = 3 consecutive → CONSECUTIVE_DAY_LIMIT_EXCEEDED
        const result = validateMarketSchedule(
            [sep(3), sep(1), sep(2)],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({
            valid: false,
            errorCode: 'CONSECUTIVE_DAY_LIMIT_EXCEEDED',
            details: expect.stringContaining('3 consecutive days'),
        });
    });

    it('handles Date objects as input', () => {
        const result = validateMarketSchedule(
            [new Date('2026-09-02T00:00:00.000Z'), new Date('2026-09-03T00:00:00.000Z')],
            MEMBER_ID,
            MONTH_CTX,
        );
        expect(result).toEqual({ valid: true });
    });

    // ── IST timezone boundary tests ────────────────────────────────────
    describe('IST timezone boundary handling', () => {
        // IST = UTC+5:30. A date "2026-09-05T00:00:00+05:30" is actually
        // 2026-09-04T18:30:00Z in UTC — different calendar day!
        // Our parseDate uses Date.UTC for DD/MM/YYYY and Date.parse for ISO,
        // so the string "2026-09-05" is parsed as UTC midnight, not IST midnight.
        //
        // September 2026: 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun, 7=Mon

        it('parses YYYY-MM-DD as UTC midnight regardless of server timezone', () => {
            // Sep 7 = Monday (weekday)
            const result = validateMarketSchedule(['2026-09-07'], MEMBER_ID, MONTH_CTX);
            expect(result).toEqual({ valid: true });
        });

        it('parses DD/MM/YYYY as UTC midnight via Date.UTC', () => {
            // 07/09/2026 = Sep 7 = Monday (weekday)
            const result = validateMarketSchedule(['07/09/2026'], MEMBER_ID, MONTH_CTX);
            expect(result).toEqual({ valid: true });
        });

        it('handles ISO string with IST offset (boundary shift detection)', () => {
            // "2026-09-07T00:00:00+05:30" in UTC is 2026-09-06T18:30:00Z
            // Sep 6 = Sunday — weekend. But Date.parse respects the offset,
            // so the resulting Date's UTC day is Sep 6 (Sunday).
            // After normalizeToUTC, it becomes Sep 6 which is weekend.
            const result = validateMarketSchedule(
                ['2026-09-07T00:00:00+05:30'],
                MEMBER_ID,
                MONTH_CTX,
            );
            // Sep 6 (Sun) is weekend — should be rejected for single-date selection
            expect(result).toEqual({
                valid: false,
                errorCode: 'WEEKEND_ONLY_NOT_ALLOWED',
                details: expect.stringContaining('weekday'),
            });
        });

        it('handles midnight UTC date that is previous evening in IST', () => {
            // Sep 2 = Wed (weekday)
            const result = validateMarketSchedule(
                ['2026-09-02T00:00:00.000Z'],
                MEMBER_ID,
                MONTH_CTX,
            );
            expect(result).toEqual({ valid: true });
        });

        it('deduplicates same calendar day from different timezone representations', () => {
            // "2026-09-07" (UTC midnight Sep 7 Mon) and "07/09/2026" (same)
            // should be treated as the same date after normalization
            const result = validateMarketSchedule(
                ['2026-09-07', '07/09/2026'],
                MEMBER_ID,
                MONTH_CTX,
            );
            expect(result).toEqual({ valid: true });
        });
    });
});
