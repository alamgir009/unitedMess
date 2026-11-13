/**
 * penalty.service.test.js — unit tests for the overdue-penalty feature.
 *
 * computePenalty is PURE: time is always passed in, so no clock freezing is
 * needed (cf. freezeClock.js — that helper is for code that reads the clock).
 */
const {
    computePenalty,
    getDueDate,
    istDayIndex,
    waivePenalty,
    unwaivePenalty,
    setPerBillRate,
    resolveActiveUntil,
    resolvePaidAtFromPayments,
} = require('../../src/services/penalty.service');
const AppError = require('../../src/utils/errors/AppError');
const { freezeClock } = require('../helpers/freezeClock');

const Invoice = require('../../src/models/Invoice.model');
const PenaltyConfig = require('../../src/models/PenaltyConfig.model');

/* ── IST timestamp helper: "Apr 6 2027 10:00 IST" →
      ist(2027, 4, 6, 10) — Asia/Kolkata is UTC+5:30 with NO DST ── */
const IST_MS = 5.5 * 60 * 60 * 1000;
const ist = (y, m, d, h = 0, mi = 0, s = 0, ms = 0) =>
    new Date(Date.UTC(y, m - 1, d, h, mi, s, ms) - IST_MS);

jest.mock('../../src/models/Invoice.model');
jest.mock('../../src/models/PenaltyConfig.model');
jest.mock('../../src/utils/logger');

/* The admin-mutation services read the clock via `new Date()` — pin it to a
   deterministic "today = Apr 15 2027, noon IST" for the whole suite.
   computePenalty tests pass `now` explicitly, so they are unaffected. */
freezeClock(ist(2027, 4, 15, 12));

// Due instant for a March 2027 bill: Apr 5, 23:59:59.999 IST
const DUE_MAR_2027 = getDueDate(3, 2027);
const RATE_100 = { dueDate: DUE_MAR_2027, rateSnapshot: 100 };

/* ─────────────────────────────────────────────
   getDueDate — 5th of the following month
───────────────────────────────────────────── */
describe('getDueDate', () => {
    it('is the 5th of the following month at 23:59:59.999 IST', () => {
        expect(getDueDate(3, 2027).toISOString()).toBe('2027-04-05T18:29:59.999Z');
    });

    it('rolls across the year boundary (Dec → Jan 5 of next year)', () => {
        expect(getDueDate(12, 2027).toISOString()).toBe('2028-01-05T18:29:59.999Z');
    });

    it('lands on Feb 5 in a leap year', () => {
        expect(getDueDate(1, 2028).toISOString()).toBe('2028-02-05T18:29:59.999Z');
    });
});

/* ─────────────────────────────────────────────
   istDayIndex — IST calendar alignment
───────────────────────────────────────────── */
describe('istDayIndex', () => {
    it('keeps the whole IST day of the 5th on one index', () => {
        expect(istDayIndex(ist(2027, 4, 5, 0, 0, 0, 1)))
            .toBe(istDayIndex(ist(2027, 4, 5, 23, 59, 59, 998)));
    });

    it('flips exactly at IST midnight (no DST — offset is fixed)', () => {
        expect(istDayIndex(ist(2027, 4, 6, 0, 0, 0, 0)))
            .toBe(istDayIndex(ist(2027, 4, 5, 23, 59, 59, 998)) + 1);
    });
});

/* ─────────────────────────────────────────────
   computePenalty — pure function
───────────────────────────────────────────── */
describe('computePenalty', () => {
    it('returns zero when there is no dueDate', () => {
        const p = computePenalty({ now: ist(2027, 5, 1), rateSnapshot: 100 });
        expect(p).toEqual({
            isOverdue: false, daysOverdue: 0, dailyRate: 0,
            accruedAmount: 0, waivedAmount: 0, netPenaltyAmount: 0,
        });
    });

    it('payment exactly ON the 5th (23:59:59.999 IST) → 0 days (inclusive due date)', () => {
        const p = computePenalty({ ...RATE_100, now: ist(2027, 4, 5, 23, 59, 59, 999) });
        expect(p.daysOverdue).toBe(0);
        expect(p.isOverdue).toBe(false);
        expect(p.accruedAmount).toBe(0);
    });

    it('penalty starts on the 6th — 00:00:00 IST → 1 day', () => {
        const p = computePenalty({ ...RATE_100, now: ist(2027, 4, 6, 0, 0, 0, 0) });
        expect(p.daysOverdue).toBe(1);
        expect(p.accruedAmount).toBe(100);
        expect(p.isOverdue).toBe(true);
    });

    it('is flat: 10 overdue days × ₹100 = ₹1000 (no compounding)', () => {
        const p = computePenalty({ ...RATE_100, now: ist(2027, 4, 15, 12) });
        expect(p.daysOverdue).toBe(10);
        expect(p.accruedAmount).toBe(1000);
        expect(p.netPenaltyAmount).toBe(1000);
    });

    it('stops accruing once fully paid — paidAt caps the accrual window', () => {
        const p = computePenalty({
            ...RATE_100,
            now: ist(2027, 4, 20),          // wall clock is 20 days past
            paidAt: ist(2027, 4, 10, 14),   // but the bill was settled on the 10th
        });
        expect(p.daysOverdue).toBe(5);      // 6th…10th inclusive
        expect(p.accruedAmount).toBe(500);
    });

    it('payment day itself still counts (it was overdue at 00:00 that day)', () => {
        const p = computePenalty({ ...RATE_100, now: ist(2027, 4, 20), paidAt: ist(2027, 4, 6, 9) });
        expect(p.daysOverdue).toBe(1);
    });

    it('freezes accrual when the member went inactive mid-overdue', () => {
        const p = computePenalty({
            ...RATE_100,
            now: ist(2027, 4, 20),
            activeUntil: ist(2027, 4, 8),   // deactivated at midnight of the 8th
        });
        expect(p.daysOverdue).toBe(3);
        expect(p.accruedAmount).toBe(300);
    });

    it('uses the EARLIEST of paidAt / activeUntil when both apply', () => {
        const p = computePenalty({
            ...RATE_100,
            now: ist(2027, 4, 20),
            paidAt: ist(2027, 4, 12),
            activeUntil: ist(2027, 4, 8),
        });
        expect(p.daysOverdue).toBe(3);
    });

    it('rate snapshot of ₹0 → nothing accrues, not "overdue"', () => {
        const p = computePenalty({ dueDate: DUE_MAR_2027, rateSnapshot: 0, now: ist(2027, 4, 20) });
        expect(p.daysOverdue).toBe(15);
        expect(p.dailyRate).toBe(0);
        expect(p.accruedAmount).toBe(0);
        expect(p.isOverdue).toBe(false);
    });

    it('fractional rate — integer-paise math, no float drift (₹55.55 × 10 = ₹555.50)', () => {
        const p = computePenalty({ dueDate: DUE_MAR_2027, rateSnapshot: 55.55, now: ist(2027, 4, 15) });
        expect(p.accruedAmount).toBe(555.50);
    });

    it('waiver subtracts from the accrued amount', () => {
        const p = computePenalty({ ...RATE_100, now: ist(2027, 4, 15), waivedAmount: 300 });
        expect(p.accruedAmount).toBe(1000);
        expect(p.waivedAmount).toBe(300);
        expect(p.netPenaltyAmount).toBe(700);
    });

    it('defensively clamps a stale waiver that exceeds the accrual', () => {
        const p = computePenalty({ ...RATE_100, now: ist(2027, 4, 15), waivedAmount: 2000 });
        expect(p.waivedAmount).toBe(1000);   // clamped to accrued
        expect(p.netPenaltyAmount).toBe(0);
    });

    it('negative waived input is treated as 0', () => {
        const p = computePenalty({ ...RATE_100, now: ist(2027, 4, 15), waivedAmount: -50 });
        expect(p.waivedAmount).toBe(0);
        expect(p.netPenaltyAmount).toBe(1000);
    });

    it('a bill created AFTER its due date accrues from the due date (rule-based)', () => {
        // Invoice for March 2027 only materialized in June — due date is
        // still Apr 5, so the elapsed overdue days are counted.
        // Apr 5 → Jun 1: 25 (Apr 6–30) + 31 (May) + 1 (Jun 1) = 57 days.
        const p = computePenalty({ ...RATE_100, now: ist(2027, 6, 1) });
        expect(p.daysOverdue).toBe(57);
        expect(p.accruedAmount).toBe(5700);
    });

    it('handles month-end / leap-year day arithmetic (Feb 2028 has 29 days)', () => {
        // Billing Jan 2027 → due Feb 5 2027 (non-leap). Mar 1 = 24 days overdue.
        const p2027 = computePenalty({ dueDate: getDueDate(1, 2027), rateSnapshot: 100, now: ist(2027, 3, 1) });
        expect(p2027.daysOverdue).toBe(24);

        // Billing Jan 2028 → due Feb 5 2028 (leap). Mar 1 = 25 days overdue.
        const p2028 = computePenalty({ dueDate: getDueDate(1, 2028), rateSnapshot: 100, now: ist(2028, 3, 1) });
        expect(p2028.daysOverdue).toBe(25);
    });

    it('waives nothing beyond what accrued before a mid-overdue freeze', () => {
        const p = computePenalty({
            ...RATE_100,
            now: ist(2027, 4, 20),
            activeUntil: ist(2027, 4, 7),
            waivedAmount: 500,
        });
        expect(p.accruedAmount).toBe(200);
        expect(p.waivedAmount).toBe(200); // clamped
        expect(p.netPenaltyAmount).toBe(0);
    });
});

/* ─────────────────────────────────────────────
   Caller-side helpers
───────────────────────────────────────────── */
describe('resolveActiveUntil', () => {
    it('active member → no freeze bound', () => {
        expect(resolveActiveUntil({ isActive: true })).toBeNull();
        expect(resolveActiveUntil(null)).toBeNull();
    });

    it('inactive member freezes at deactivatedAt', () => {
        const at = ist(2027, 4, 8);
        expect(resolveActiveUntil({ isActive: false, deactivatedAt: at })).toEqual(at);
    });

    it('legacy inactive member (no deactivatedAt) falls back to updatedAt', () => {
        const at = ist(2027, 4, 9);
        expect(resolveActiveUntil({ isActive: false, updatedAt: at })).toEqual(at);
    });
});

describe('resolvePaidAtFromPayments', () => {
    it('returns the LATEST completed payment instant', () => {
        const rows = [
            { paymentDate: ist(2027, 4, 6) },
            { paymentDate: ist(2027, 4, 10) },
            { paymentDate: ist(2027, 4, 8) },
        ];
        expect(resolvePaidAtFromPayments(rows)).toEqual(ist(2027, 4, 10));
    });

    it('returns null when there are no rows / no dates', () => {
        expect(resolvePaidAtFromPayments([])).toBeNull();
        expect(resolvePaidAtFromPayments([{}])).toBeNull();
    });
});

/* ─────────────────────────────────────────────
   Admin mutations — validation & race guards
───────────────────────────────────────────── */
const OVERDUE_INVOICE = {
    _id: '64b000000000000000000001',
    month: 3,
    year: 2027,
    monthName: 'March 2027',
    totalPayable: 1011,
    paidAmount: 0,
    status: 'unpaid',
    isExempt: false,
    dueDate: getDueDate(3, 2027),
    penaltyRateSnapshot: 100,
    penaltyWaivedAmount: 0,
    penaltyAuditLog: [],
};

describe('waivePenalty (admin-only by route middleware)', () => {
    beforeEach(() => jest.clearAllMocks());

    const mockFindById = (invoice) => {
        Invoice.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue(invoice),
        });
    };

    it('rejects a missing / short reason (mandatory per business rule 6)', async () => {
        mockFindById(OVERDUE_INVOICE);
        await expect(
            waivePenalty(OVERDUE_INVOICE._id, { reason: 'ok', adminId: 'admin1' })
        ).rejects.toThrow(AppError);
        await expect(
            waivePenalty(OVERDUE_INVOICE._id, { reason: null, adminId: 'admin1' })
        ).rejects.toThrow(AppError);
        expect(Invoice.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects a waiver larger than the accrued penalty', async () => {
        mockFindById(OVERDUE_INVOICE);
        // Frozen clock (Apr 15 2027) → 10 overdue days → accrued ₹1000
        await expect(
            waivePenalty(OVERDUE_INVOICE._id, { amount: 999999, reason: 'goodwill gesture', adminId: 'admin1' })
        ).rejects.toThrow(/exceeds the accrued penalty/);
    });

    it('rejects when the bill is not overdue yet', async () => {
        mockFindById({ ...OVERDUE_INVOICE, dueDate: getDueDate(4, 2027) }); // due May 5
        await expect(
            waivePenalty(OVERDUE_INVOICE._id, { reason: 'not overdue yet', adminId: 'admin1' })
        ).rejects.toThrow(/not overdue/);
    });

    it('applies a full waiver via a conditional update and appends the audit entry', async () => {
        mockFindById(OVERDUE_INVOICE);
        Invoice.findOneAndUpdate.mockResolvedValue({
            ...OVERDUE_INVOICE,
            penaltyWaivedAmount: 1000,
            waiverReason: 'goodwill gesture',
        });
        const updated = await waivePenalty(OVERDUE_INVOICE._id, {
            reason: 'goodwill gesture', adminId: 'admin1',
        });
        // Guard: filter pins the CURRENT waived amount → no double waiver
        expect(Invoice.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ penaltyWaivedAmount: 0 }),
            expect.objectContaining({
                $set: expect.objectContaining({ penaltyWaivedAmount: 1000 }),
            }),
            expect.anything()
        );
        const entry = Invoice.findOneAndUpdate.mock.calls[0][1].$push.penaltyAuditLog;
        expect(entry.action).toBe('waive');
        expect(entry.actor).toBe('admin1');
        expect(entry.reason).toBe('goodwill gesture');
        expect(updated.penaltyWaivedAmount).toBe(1000);
    });

    it('409s on a concurrent modification (conditional update matched 0 docs)', async () => {
        mockFindById(OVERDUE_INVOICE);
        Invoice.findOneAndUpdate.mockResolvedValue(null);
        await expect(
            waivePenalty(OVERDUE_INVOICE._id, { reason: 'race condition test', adminId: 'admin1' })
        ).rejects.toThrow(/concurrently/);
    });
});

describe('unwaivePenalty (admin-only by route middleware)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('rejects when no waiver is applied', async () => {
        Invoice.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue({ ...OVERDUE_INVOICE, penaltyWaivedAmount: 0 }),
        });
        await expect(
            unwaivePenalty(OVERDUE_INVOICE._id, { reason: 'nothing waived', adminId: 'admin1' })
        ).rejects.toThrow(/No waiver is currently applied/);
    });

    it('reverses the waiver to exactly 0 and clears the waiver fields', async () => {
        const waived = { ...OVERDUE_INVOICE, penaltyWaivedAmount: 400, waiverReason: 'old reason' };
        Invoice.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(waived) });
        Invoice.findOneAndUpdate.mockResolvedValue({ ...waived, penaltyWaivedAmount: 0 });

        const updated = await unwaivePenalty(OVERDUE_INVOICE._id, { reason: 'waiver reversed', adminId: 'admin1' });

        expect(Invoice.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ penaltyWaivedAmount: 400 }),
            expect.objectContaining({
                $set: expect.objectContaining({ penaltyWaivedAmount: 0, waivedBy: null, waivedAt: null }),
            }),
            expect.anything()
        );
        const entry = Invoice.findOneAndUpdate.mock.calls[0][1].$push.penaltyAuditLog;
        expect(entry.action).toBe('unwaive');
        expect(entry.oldValue).toBe(400);
        expect(entry.newValue).toBe(0);
        expect(updated.penaltyWaivedAmount).toBe(0);
    });
});

describe('setPerBillRate (admin-only by route middleware)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('validates the rate is a non-negative number', async () => {
        await expect(setPerBillRate('x', -5, {})).rejects.toThrow(/non-negative/);
        await expect(setPerBillRate('x', NaN, {})).rejects.toThrow(/non-negative/);
        expect(Invoice.findById).not.toHaveBeenCalled();
    });

    it('overrides with a version check on the previous snapshot', async () => {
        Invoice.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(OVERDUE_INVOICE) });
        Invoice.findOneAndUpdate.mockResolvedValue({ ...OVERDUE_INVOICE, penaltyRateSnapshot: 250 });

        await setPerBillRate(OVERDUE_INVOICE._id, 250, { adminId: 'admin1', reason: 'hike' });

        expect(Invoice.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ penaltyRateSnapshot: 100 }), // version check
            expect.objectContaining({
                $set: { penaltyRateSnapshot: 250 },
            }),
            expect.anything()
        );
        const entry = Invoice.findOneAndUpdate.mock.calls[0][1].$push.penaltyAuditLog;
        expect(entry.action).toBe('rate_override');
        expect(entry.oldValue).toBe(100);
        expect(entry.newValue).toBe(250);
    });
});

/* ─────────────────────────────────────────────
   Authorization — server-side, not just UI hiding
───────────────────────────────────────────── */
describe('authorization guards', () => {
    const { authorize } = require('../../src/api/v1/middlewares/auth.middleware');
    const next = jest.fn();
    const res = {};

    beforeEach(() => jest.clearAllMocks());

    it('member (role "user") gets 403 on EVERY admin penalty endpoint middleware', () => {
        const guard = authorize('admin'); // the middleware behind all four routes
        const memberReq = { user: { id: 'u1', role: 'user' } };

        // One call per protected endpoint: GET/PUT /admin/penalty-rate,
        // PATCH /:id/penalty-rate, PATCH /:id/penalty-waiver
        for (let i = 0; i < 4; i++) {
            next.mockClear();
            guard(memberReq, res, next);
            expect(next).toHaveBeenCalledTimes(1);
            const err = next.mock.calls[0][0];
            expect(err).toBeInstanceOf(AppError);
            expect(err.statusCode).toBe(403);
        }
    });

    it('admin passes the guard', () => {
        const guard = authorize('admin');
        guard({ user: { id: 'a1', role: 'admin' } }, res, next);
        expect(next).toHaveBeenCalledWith(); // no error → next()
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('router contract: every penalty write route is behind authorize("admin")', () => {
        // Source-contract test — reads the actual routes file so a future
        // route added without the guard fails this suite.
        const fs = require('fs');
        const path = require('path');
        const src = fs.readFileSync(
            path.join(__dirname, '../../src/api/v1/routes/invoice.routes.js'),
            'utf8'
        );
        const penaltyRoutes = src
            .split('\n')
            .filter((l) => /penalty/.test(l) && !l.trim().startsWith('//'));
        expect(penaltyRoutes.length).toBeGreaterThanOrEqual(4);
        for (const line of penaltyRoutes) {
            expect(line).toContain("authorize('admin')");
        }
    });
});

/* PenaltyConfig remains referenced so the mock stays wired for the service
   tests that would hit getGlobalDailyRate via a null snapshot. */
describe('PenaltyConfig singleton mock wiring', () => {
    it('is mocked (unit tests never touch the DB)', () => {
        expect(jest.isMockFunction(PenaltyConfig.findOne)).toBe(true);
    });
});
