const mongoose = require('mongoose');
const Invoice = require('../models/Invoice.model');
const PenaltyConfig = require('../models/PenaltyConfig.model');
const User = require('../models/User.model');
const Payment = require('../models/Payment.model');
const AppError = require('../utils/errors/AppError');
const logger = require('../utils/logger');

/* Whole-rupee settlement tolerance — mirrors invoice.service.SETTLEMENT_TOLERANCE. */
const SETTLEMENT_TOLERANCE = 1;

const DEFAULT_DAILY_RATE = 100;
const DUE_DAY = 5; // due on the 5th of the month AFTER the billing month
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // Asia/Kolkata — no DST, fixed offset
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Round rupees to 2dp, same convention as invoice.service.round2. */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Index of the IST calendar day a timestamp falls in.
 * Adding the fixed 5:30 IST offset aligns IST midnights onto exact day
 * boundaries, so month-end / leap-year arithmetic reduces to plain integer
 * day-index subtraction. IST has no DST, so the offset never shifts.
 */
const istDayIndex = (date) =>
    Math.floor((date.getTime() + IST_OFFSET_MS) / MS_PER_DAY);

/**
 * Build the due date for a billing month: 5th of the following month,
 * 23:59:59.999 IST (inclusive). Penalty starts on the 6th.
 *
 * @param {number} month — billing month, 1-indexed
 * @param {number} year  — billing year
 * @returns {Date}
 */
const getDueDate = (month, year) => {
    // nextMonth=12 → (year, 12, 5) rolls to Jan 5 of year+1 via Date.UTC overflow
    const nextMonth = month; // 0-indexed month of the FOLLOWING month
    // 23:59:59.999 IST === 18:29:59.999 UTC (IST = UTC+5:30, no DST)
    return new Date(Date.UTC(year, nextMonth, DUE_DAY, 18, 29, 59, 999));
};

/**
 * ─────────────────────────────────────────────────────────────────────────
 * computePenalty — THE single pure, unit-testable penalty function.
 * ─────────────────────────────────────────────────────────────────────────
 * No DB access, no side effects, no clock reads (time is always passed in).
 *
 * Business rules encoded here:
 *  1. Penalty accrues per overdue calendar day (IST), flat:
 *        accrued = daysOverdue × dailyRate      (no compounding)
 *  2. Due date = 5th of the following month, 23:59:59 IST INCLUSIVE.
 *     Payment exactly on the 5th → 0 days. Penalty starts on the 6th.
 *  3. Accrual window ends at the EARLIEST of:
 *        `now`             — wall clock at read time
 *        `paidAt`          — bill became fully paid (stops accruing)
 *        `activeUntil`     — member went inactive mid-overdue (freeze)
 *  4. `waivedAmount` is an admin-granted waiver, never exceeding the accrued
 *     amount (clamped defensively against stale stored values).
 *  5. All money math happens on INTEGER PAISE; the rupee-Number conversion
 *     happens exactly once at the boundary (matches the existing money type).
 *
 * @param {{
 *   dueDate?: Date|null,       — stored on the invoice
 *   now?: Date,                — "current" time (defaults to new Date())
 *   rateSnapshot?: number|null — ₹/day frozen on the invoice (or override)
 *   paidAt?: Date|null         — when the bill was fully paid, if it is
 *   activeUntil?: Date|null    — deactivation instant, if the member is inactive
 *   waivedAmount?: number      — rupees already waived
 * }} input
 * @returns {{
 *   isOverdue: boolean, daysOverdue: number, dailyRate: number,
 *   accruedAmount: number, waivedAmount: number, netPenaltyAmount: number,
 * }}
 */
function computePenalty({
    dueDate = null,
    now = null,
    rateSnapshot = null,
    paidAt = null,
    activeUntil = null,
    waivedAmount = 0,
} = {}) {
    const currentTime = now instanceof Date ? now : (now ? new Date(now) : new Date());
    const due = dueDate instanceof Date ? dueDate : (dueDate ? new Date(dueDate) : null);

    if (!due || isNaN(due.getTime())) {
        return { isOverdue: false, daysOverdue: 0, dailyRate: 0, accruedAmount: 0, waivedAmount: 0, netPenaltyAmount: 0 };
    }

    // Accrual end = earliest wall clock / full payment / inactivity freeze.
    let end = currentTime;
    for (const bound of [paidAt, activeUntil]) {
        if (bound) {
            const b = bound instanceof Date ? bound : new Date(bound);
            if (!isNaN(b.getTime()) && b.getTime() < end.getTime()) end = b;
        }
    }

    // Calendar-day difference in IST. The due instant is 23:59:59.999 IST on
    // the 5th, so any time on the 6th IST yields +1; on the 5th itself, 0.
    const daysOverdue = Math.max(0, istDayIndex(end) - istDayIndex(due));

    const dailyRate = Number(rateSnapshot ?? 0) || 0;
    const ratePaise = Math.round(dailyRate * 100);                       // int paise
    const accruedPaise = daysOverdue * ratePaise;                        // int × int

    // Waiver cannot exceed what has actually accrued (defensive clamp).
    const waivedPaise = Math.min(
        accruedPaise,
        Math.max(0, Math.round((Number(waivedAmount) || 0) * 100))
    );
    const netPaise = accruedPaise - waivedPaise;

    return {
        isOverdue: daysOverdue > 0 && dailyRate > 0,
        daysOverdue,
        dailyRate: round2(dailyRate),
        accruedAmount: accruedPaise / 100,
        waivedAmount: waivedPaise / 100,
        netPenaltyAmount: netPaise / 100,
    };
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * Snapshot resolution — the rate a bill accrues at.
 * ─────────────────────────────────────────────────────────────────────────
 * Rule: the global rate is SNAPSHOTTED onto a bill the first time it becomes
 * overdue; later global-rate changes affect only newly overdue bills, unless
 * an admin overrides the rate on a specific bill (also stored in
 * penaltyRateSnapshot, with an audit entry).
 *
 * In a compute-on-read design (no cron mutates amounts) the snapshot is
 * written lazily and idempotently: an overdue bill without a snapshot gets
 * one via a conditional update (filter `penaltyRateSnapshot: null`), so a
 * concurrent double-snapshot is impossible — one writer wins, the other
 * matches 0 documents.
 *
 * @returns {Promise<number>} effective ₹/day for NEW overdue bills
 */
const getGlobalDailyRate = async () => {
    let config = await PenaltyConfig.findOne().lean();
    if (!config) {
        // First run: mint the singleton with the default ₹100/day.
        await PenaltyConfig.create({ dailyRate: DEFAULT_DAILY_RATE });
        config = { dailyRate: DEFAULT_DAILY_RATE };
    }
    return Number(config.dailyRate) || 0;
};

/**
 * Lazy, idempotent snapshot write for overdue invoices that have none.
 * One bulkWrite round-trip; the `penaltyRateSnapshot: null` filter makes
 * every operation a no-op if a concurrent writer already snapshotted.
 */
const snapshotOverdueRates = async (invoices, rate) => {
    const ops = [];
    for (const inv of invoices) {
        if (!inv.penalty?.isOverdue) continue;
        if (inv.penaltyRateSnapshot != null) continue;
        if (!inv._id) continue;
        ops.push({
            updateOne: {
                filter: { _id: inv._id, penaltyRateSnapshot: null },
                update: {
                    $set: { penaltyRateSnapshot: rate },
                    $push: {
                        penaltyAuditLog: {
                            action: 'snapshot',
                            actor: null,
                            oldValue: null,
                            newValue: rate,
                            reason: 'Automatic snapshot when the bill first became overdue',
                            at: new Date(),
                        },
                    },
                },
            },
        });
    }
    if (ops.length === 0) return;
    try {
        await Invoice.bulkWrite(ops, { ordered: false });
    } catch (err) {
        // Snapshotting is best-effort bookkeeping — never fail the read.
        logger.error('[Penalty] Lazy snapshot bulkWrite failed', { message: err.message });
    }
};

/**
 * Read the member's accrual-freeze instant from a (populated or fetched) user.
 * Active members accrue until "now" (null bound). Inactive members freeze at
 * their deactivation instant (deactivatedAt; updatedAt as a legacy fallback —
 * the last write to the user doc IS the deactivation write).
 */
const resolveActiveUntil = (user, now = new Date()) => {
    if (!user) return null;
    if (user.isActive !== false) return null;
    const at = user.deactivatedAt || user.updatedAt || now;
    return at instanceof Date ? at : new Date(at);
};

/**
 * When did the bill become FULLY paid? Needed so a paid bill stops accruing
 * at the right instant (rule 3). Resolved from the completed mess_bill
 * Payment records — the same ground truth calculatePaidAmount uses.
 *
 * Caller must batch these per user list (annotatePenalties does) — no N+1.
 */
const resolvePaidAtFromPayments = (paymentRows) => {
    // Latest completed payment for the month, even if the full amount only
    // came together across several payments — the LAST one is the instant
    // the bill crossed "fully paid" (or was already paid and topped up).
    let latest = null;
    for (const p of paymentRows) {
        const at = p.paymentDate || p.createdAt;
        if (at && (!latest || at > latest)) latest = at;
    }
    return latest;
};

/**
 * ─────────────────────────────────────────────────────────────────────────
 * annotatePenalties — attach `invoice.penalty` to lean invoice objects.
 * ─────────────────────────────────────────────────────────────────────────
 * Batched (no N+1): one PenaltyConfig read, one User query for any bare
 * user ids, one Payment query for any fully-paid invoices. Skips exempt and
 * negative-payable (refund) invoices — penalty only exists on real debt.
 * Also lazily snapshots the global rate onto newly-overdue bills.
 *
 * @param {Array<Object>} invoices — lean invoice objects (mutated in place)
 * @param {{ usersById?: Map<string, Object> }} opts — pre-fetched users
 *   (getAdminUnpaidInvoices already populates them — reuse, don't re-query)
 */
const annotatePenalties = async (invoices, { usersById } = {}) => {
    if (!Array.isArray(invoices) || invoices.length === 0) return invoices || [];

    const now = new Date();

    // Only bills that can carry a penalty: positive payable, not exempt.
    const candidates = invoices.filter((inv) =>
        (Number(inv.totalPayable) || 0) > 0 &&
        inv.isExempt !== true &&
        inv.status !== 'refunded'
    );
    if (candidates.length === 0) return invoices;

    const rate = await getGlobalDailyRate();

    // ── Users (activeUntil source) — batch ──────────────────────────────
    const userIds = [...new Set(
        candidates
            .map((inv) => inv.user?._id ?? inv.user)
            .filter(Boolean)
            .map(String)
    )];
    const localUsersById = new Map();
    if (usersById) {
        for (const [k, v] of usersById) localUsersById.set(String(k), v);
    }
    const missingIds = userIds.filter((id) => !localUsersById.has(id));
    if (missingIds.length > 0) {
        const userRows = await User.find(
            { _id: { $in: missingIds } }
        ).select('isActive deactivatedAt updatedAt').lean();
        for (const u of userRows) localUsersById.set(String(u._id), u);
    }

    // ── paidAt for fully-paid invoices — one batched query ──────────────
    const paidCandidates = candidates.filter((inv) => inv.status === 'paid');
    const paidAtByKey = new Map();
    if (paidCandidates.length > 0) {
        const monthNames = [...new Set(paidCandidates.map((inv) => inv.monthName).filter(Boolean))];
        const paymentRows = await Payment.find({
            user: { $in: userIds },
            month: { $in: monthNames },
            status: 'completed',
            type: 'mess_bill',
        }).select('user month paymentDate createdAt').lean();

        const byKey = new Map(); // `${userId}|${monthName}` → rows
        for (const p of paymentRows) {
            const key = `${String(p.user?._id ?? p.user)}|${p.month}`;
            if (!byKey.has(key)) byKey.set(key, []);
            byKey.get(key).push(p);
        }
        for (const inv of paidCandidates) {
            const key = `${String(inv.user?._id ?? inv.user)}|${inv.monthName}`;
            const at = resolvePaidAtFromPayments(byKey.get(key) || []);
            if (at) paidAtByKey.set(String(inv._id), at);
        }
    }

    // ── Compute + attach ────────────────────────────────────────────────
    for (const inv of candidates) {
        const user = localUsersById.get(String(inv.user?._id ?? inv.user));
        const paidAt = paidAtByKey.get(String(inv._id)) || null;
        const dueDate = inv.dueDate
            ?? (inv.month && inv.year ? getDueDate(inv.month, inv.year) : null);

        const breakdown = computePenalty({
            dueDate,
            now,
            rateSnapshot: inv.penaltyRateSnapshot ?? rate,
            paidAt,
            activeUntil: resolveActiveUntil(user, now),
            waivedAmount: inv.penaltyWaivedAmount,
        });
        breakdown.dueDate = dueDate;
        inv.penalty = breakdown;
    }

    // ── Lazy snapshot of the global rate onto newly-overdue bills ───────
    await snapshotOverdueRates(candidates, rate);

    return invoices;
};

/**
 * Admin: update the GLOBAL daily penalty rate (₹/day, ≥ 0).
 * Affects only NEWLY overdue bills — existing snapshots are untouched.
 */
const updateGlobalRate = async (dailyRate, adminId) => {
    if (typeof dailyRate !== 'number' || isNaN(dailyRate) || dailyRate < 0) {
        throw new AppError('dailyRate must be a non-negative number', 400);
    }
    const value = round2(dailyRate);

    await getGlobalDailyRate(); // ensure the singleton exists
    const config = await PenaltyConfig.findOneAndUpdate(
        {},
        { $set: { dailyRate: value, updatedBy: adminId || null } },
        { new: true, runValidators: true, upsert: true }
    ).lean();
    return config;
};

const MIN_REASON_LENGTH = 5; // mirrors the exemption reason convention

const requireReason = (reason) => {
    const trimmed = typeof reason === 'string' ? reason.trim() : '';
    if (trimmed.length < MIN_REASON_LENGTH) {
        throw new AppError(`A reason of at least ${MIN_REASON_LENGTH} characters is required`, 400);
    }
    return trimmed;
};

const requireInvoice = async (invoiceId) => {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        throw new AppError('Invalid invoice id', 400);
    }
    const invoice = await Invoice.findById(invoiceId).lean();
    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
};

const appendAudit = (invoice, entry) => {
    const log = Array.isArray(invoice.penaltyAuditLog) ? invoice.penaltyAuditLog : [];
    return { ...invoice, penaltyAuditLog: [...log, entry] };
};

/**
 * Admin: override the penalty RATE on ONE bill (any value ≥ 0).
 * Conditional update on the previous snapshot value — a version check that
 * makes two concurrent overrides serialize (the loser matches 0 docs → 409).
 */
const setPerBillRate = async (invoiceId, dailyRate, { adminId = null, reason = null } = {}) => {
    if (typeof dailyRate !== 'number' || isNaN(dailyRate) || dailyRate < 0) {
        throw new AppError('dailyRate must be a non-negative number', 400);
    }
    const value = round2(dailyRate);
    const invoice = await requireInvoice(invoiceId);

    const oldValue = invoice.penaltyRateSnapshot ?? null;
    const updated = await Invoice.findOneAndUpdate(
        { _id: invoice._id, penaltyRateSnapshot: oldValue },
        {
            $set: { penaltyRateSnapshot: value },
            $push: {
                penaltyAuditLog: {
                    action: 'rate_override',
                    actor: adminId || null,
                    oldValue,
                    newValue: value,
                    reason: typeof reason === 'string' && reason.trim() ? reason.trim() : null,
                    at: new Date(),
                },
            },
        },
        { new: true, runValidators: true }
    ).lean();

    if (!updated) {
        throw new AppError('The bill was modified concurrently — reload and retry', 409);
    }
    return updated;
};

/**
 * Admin: WAIVE part or all of a bill's accrued penalty. Reason mandatory.
 * Waiver ≤ accrued penalty is validated against the SAME pure function the
 * read path uses, then applied with a conditional update on the CURRENT
 * waived amount — so two concurrent waives can never stack past the accrued
 * penalty (the second update matches 0 docs → 409).
 */
const waivePenalty = async (invoiceId, { amount = null, reason = null, adminId = null } = {}) => {
    const trimmedReason = requireReason(reason);
    const invoice = await requireInvoice(invoiceId);

    if (invoice.isExempt === true || (Number(invoice.totalPayable) || 0) <= 0) {
        throw new AppError('This bill carries no penalty — it is exempt or not a debt', 409);
    }

    const breakdown = computePenalty({
        dueDate: invoice.dueDate ?? (invoice.month && invoice.year ? getDueDate(invoice.month, invoice.year) : null),
        now: new Date(),
        rateSnapshot: invoice.penaltyRateSnapshot ?? (await getGlobalDailyRate()),
        paidAt: null, // accrual-to-now is the ceiling a waiver can cover today
        activeUntil: null,
        waivedAmount: invoice.penaltyWaivedAmount,
    });

    if (breakdown.daysOverdue === 0) {
        throw new AppError('This bill is not overdue yet — nothing to waive', 409);
    }

    const accrued = breakdown.accruedAmount;
    const alreadyWaived = Number(invoice.penaltyWaivedAmount) || 0;
    const requested = amount == null
        ? accrued - alreadyWaived // full waiver of the remaining accrual
        : Number(amount);
    if (isNaN(requested) || requested <= 0) {
        throw new AppError('Waiver amount must be a positive number', 400);
    }
    const newTotalWaived = round2(alreadyWaived + requested);
    if (newTotalWaived > accrued + SETTLEMENT_TOLERANCE) {
        throw new AppError(
            `Waiver of ₹${round2(requested)} exceeds the accrued penalty of ₹${round2(accrued - alreadyWaived)}`,
            400
        );
    }

    const updated = await Invoice.findOneAndUpdate(
        { _id: invoice._id, penaltyWaivedAmount: alreadyWaived },
        {
            $set: {
                penaltyWaivedAmount: newTotalWaived,
                waiverReason: trimmedReason,
                waivedBy: adminId || null,
                waivedAt: new Date(),
            },
            $push: {
                penaltyAuditLog: {
                    action: 'waive',
                    actor: adminId || null,
                    oldValue: alreadyWaived,
                    newValue: newTotalWaived,
                    reason: trimmedReason,
                    at: new Date(),
                },
            },
        },
        { new: true, runValidators: true }
    ).lean();

    if (!updated) {
        throw new AppError('The bill was modified concurrently — reload and retry', 409);
    }
    return updated;
};

/**
 * Admin: REVERSE a waiver (rule 6 — waiver is reversible). Reason mandatory.
 * Conditional update on `penaltyWaivedAmount > 0` — an unwaive racing a waive
 * or another unwaive can never double-apply.
 */
const unwaivePenalty = async (invoiceId, { reason = null, adminId = null } = {}) => {
    const trimmedReason = requireReason(reason);
    const invoice = await requireInvoice(invoiceId);

    const oldValue = Number(invoice.penaltyWaivedAmount) || 0;
    if (oldValue <= 0) {
        throw new AppError('No waiver is currently applied to this bill', 409);
    }

    const updated = await Invoice.findOneAndUpdate(
        { _id: invoice._id, penaltyWaivedAmount: oldValue },
        {
            $set: {
                penaltyWaivedAmount: 0,
                waiverReason: null,
                waivedBy: null,
                waivedAt: null,
            },
            $push: {
                penaltyAuditLog: {
                    action: 'unwaive',
                    actor: adminId || null,
                    oldValue,
                    newValue: 0,
                    reason: trimmedReason,
                    at: new Date(),
                },
            },
        },
        { new: true, runValidators: true }
    ).lean();

    if (!updated) {
        throw new AppError('The bill was modified concurrently — reload and retry', 409);
    }
    return updated;
};

module.exports = {
    DEFAULT_DAILY_RATE,
    SETTLEMENT_TOLERANCE,
    computePenalty,
    getDueDate,
    istDayIndex,
    getGlobalDailyRate,
    resolveActiveUntil,
    resolvePaidAtFromPayments,
    annotatePenalties,
    updateGlobalRate,
    setPerBillRate,
    waivePenalty,
    unwaivePenalty,
    // exposed for tests / internal reuse
    __internals: { appendAudit, requireInvoice, requireReason },
};
