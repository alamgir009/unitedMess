const mongoose = require('mongoose');
const Invoice = require('../models/Invoice.model');
const User = require('../models/User.model');
const Meal = require('../models/Meal.model');
const Market = require('../models/Market.model');
const Payment = require('../models/Payment.model');
const AppError = require('../utils/errors/AppError');
const logger = require('../utils/logger');
const { getBillingPeriod, getLastFinalizedPeriod } = require('../utils/helpers/date.helper');
const {
    OVERRIDE,
    resolveExemption,
    normalizeOverride,
} = require('./billingExemption.service');
const emailService = require('./email.service');
const pdfService   = require('./pdf.service');

/* Whole-rupee settlement tolerance: the UI suggests/stores rounded payables
   (₹1011) while invoices keep paise (₹1011.29) — a shortfall under ₹1 still
   settles the invoice, otherwise "full" payments stick on partially_paid. */
const SETTLEMENT_TOLERANCE = 1;

/**
 * Determine invoice status from paidAmount and totalPayable.
 * Fintech-grade deterministic logic:
 *  - paidAmount < 0        → refunded (never unpaid)
 *  - totalPayable <= 0     → refunded/credit or zero → refunded/paid
 *  - paidAmount >= totalPayable - ₹1 tolerance → paid
 *  - paidAmount > 0        → partially_paid
 *  - otherwise             → unpaid
 */
function determineInvoiceStatus(paidAmount, totalPayable) {
    if (paidAmount < 0) return 'refunded';
    if (totalPayable < 0) return 'refunded';
    if (totalPayable === 0) return 'paid';
    if (paidAmount >= totalPayable - SETTLEMENT_TOLERANCE) return 'paid';
    if (paidAmount > 0) return 'partially_paid';
    return 'unpaid';
}

/**
 * Get date range for a specific month/year
 */
const getMonthRange = (month, year) => {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { start, end };
};

/**
 * Calculate the overall stats for the mess for a given month
 * Used to determine the meal rate.
 */
const calculateMessStats = async (month, year) => {
    const { start, end } = getMonthRange(month, year);

    // Aggregate total meals and guest meals for the month
    const mealStats = await Meal.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: null,
                totalMealCount: { $sum: '$mealCount' },
                totalGuestCount: { $sum: '$guestCount' }
            }
        }
    ]);

    // Aggregate total market amount for the month
    const marketStats = await Market.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);

    const stats = {
        totalMealCount: Number(mealStats[0]?.totalMealCount || 0),
        totalGuestCount: Number(mealStats[0]?.totalGuestCount || 0),
        totalMarketAmount: Number(marketStats[0]?.totalAmount || 0)
    };

    const [settingsUser] = await User.find({ isActive: true, userStatus: 'approved' })
        .select('chargePerGuestMeal').lean();
    const guestMealRate = settingsUser?.chargePerGuestMeal || 60;
    const guestRevenue = stats.totalGuestCount * guestMealRate;

    const totalOwnMeals = stats.totalMealCount - stats.totalGuestCount;
    const mealRate = totalOwnMeals > 0 
        ? (stats.totalMarketAmount - guestRevenue) / totalOwnMeals 
        : 0;

    return { 
        ...stats, 
        mealRate: Number(mealRate.toFixed(4)), 
        guestRevenue 
    };
};

/**
 * Attach the most recent completed mess-bill payment metadata to an
 * invoice-shaped plain object (used by the PDF / invoice preview UI).
 */
const _attachLatestPayment = async (invoiceObj, userId) => {
    const latestPayment = await Payment.findOne({
        user: userId, month: invoiceObj.monthName, status: 'completed', type: 'mess_bill',
    }).sort({ paymentDate: -1 }).lean();

    if (latestPayment) {
        invoiceObj._paymentMethod = latestPayment.paymentMethod;
        invoiceObj._transactionId = latestPayment.transactionId || null;
        invoiceObj._utr = latestPayment.utr || null;
        invoiceObj._paymentDate = latestPayment.paymentDate;
    }
    return invoiceObj;
};

/**
 * Calculate/Get invoice for a specific user and month.
 *
 * EXEMPTION POLICY — see billingExemption.service.js
 *  - Admin intent (`exemptOverride`) always wins.
 *  - Otherwise the only automatic rule is zero-activity in the period.
 *  - There is NO date-based (activatedAt / createdAt / billingExemptMonth)
 *    exemption anywhere in this function.
 *
 * SIDE-EFFECT CONTRACT:
 *  - Finalized (closed) invoices are returned VERBATIM — a read never
 *    mutates closed books.
 *  - Open invoices are recalculated and persisted only when something
 *    actually changed (`isModified()`).
 */
const getInvoice = async (userId, month, year) => {
    const invoice = await Invoice.findOne({ user: userId, month, year });
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404);

    // ── FINALIZED (CLOSED) PERIOD — STRICTLY READ-ONLY ──────────────
    if (invoice && invoice.isFinalized) {
        const invoiceObj = invoice.toObject();
        invoiceObj.remainingAmount = Math.max(0, invoiceObj.totalPayable - invoiceObj.paidAmount);
        return _attachLatestPayment(invoiceObj, userId);
    }

    // ── PERIOD FACTS — one parallel block, computed exactly once ─────
    const { start, end } = getMonthRange(month, year);
    const [livePaidAmount, messStats, userMeals, userMarkets] = await Promise.all([
        calculatePaidAmount(userId, month, year),
        calculateMessStats(month, year),
        Meal.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    mealCount: { $sum: '$mealCount' },
                    guestCount: { $sum: '$guestCount' }
                }
            }
        ]),
        Market.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]),
    ]);

    const uMealCount = userMeals[0]?.mealCount || 0;
    const uGuestCount = userMeals[0]?.guestCount || 0;
    const uMarketSpent = userMarkets[0]?.totalAmount || 0;

    // ── EXEMPTION RESOLUTION — single source of truth ────────────────
    const { isExempt, exemptSource, exemptReason } = resolveExemption({
        override: normalizeOverride(invoice?.exemptOverride),
        totalMeal: uMealCount,
        totalMarketAmount: uMarketSpent,
        paidAmount: Math.max(livePaidAmount || 0, invoice?.paidAmount || 0),
        reason: invoice?.exemptReason,
    });

    const monthName = new Intl.DateTimeFormat('en-US', {
        month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));

    // ── EXEMPT (open period) PATH ────────────────────────────────────
    // Money is zeroed. Recorded FACTS (mealCount / guestMealCount /
    // marketAmountSpent) are preserved so audits and PDFs keep showing
    // what actually happened — only the amount owed changes.
    if (isExempt) {
        const exemptionPatch = {
            mealRate: 0,
            messCost: 0,
            guestMealRevenue: 0,
            fixedCosts: { cookingCharge: 0, waterBill: 0, gasBillCharge: 0, platformFee: 0 },
            totalBill: 0,
            totalPayable: 0,
            paidAmount: 0,
            status: 'paid',
            isExempt: true,
            exemptReason,
            exemptSource,
            isFinalized: false,
        };

        if (invoice) {
            Object.assign(invoice, exemptionPatch);
            if (invoice.isModified()) await invoice.save();
            const invoiceObj = invoice.toObject();
            invoiceObj.remainingAmount = 0;
            return invoiceObj;
        }

        const created = await Invoice.create({
            user: userId, month, year, monthName,
            mealCount: uMealCount,
            guestMealCount: uGuestCount,
            marketAmountSpent: uMarketSpent,
            ...exemptionPatch,
        });
        const createdObj = created.toObject();
        createdObj.remainingAmount = 0;
        return createdObj;
    }

    // ── NON-EXEMPT: calculate bill ───────────────────────────────────
    const uOwnMeals = uMealCount - uGuestCount;
    const messCost = uOwnMeals * messStats.mealRate;
    const guestRevenue = uGuestCount * (user.chargePerGuestMeal || 60);

    const totalBill = messCost + (user.cookingCharge || 0) + (user.waterBill || 0) + (user.platformFee || 0) + guestRevenue - uMarketSpent;

    const invoiceData = {
        user: userId, month, year, monthName,
        mealCount: uOwnMeals,
        guestMealCount: uGuestCount,
        marketAmountSpent: uMarketSpent,
        mealRate: messStats.mealRate,
        messCost: Number(messCost.toFixed(2)),
        guestMealRevenue: guestRevenue,
        fixedCosts: {
            cookingCharge: Number(user.cookingCharge || 0),
            waterBill: Number(user.waterBill || 0),
            gasBillCharge: Number(user.gasBillCharge || 0),
            platformFee: Number(user.platformFee || 0),
        },
        totalBill: Math.round(totalBill * 100) / 100,
        totalPayable: Math.round(totalBill * 100) / 100,
        paidAmount: livePaidAmount,
        // Clear any stale exemption left behind by a previous period state
        // (e.g. admin switched force_exempt → force_bill). The admin INTENT
        // fields (exemptOverride / exemptedBy / exemptedAt / exemptHistory)
        // are intentionally NOT touched here.
        isExempt: false,
        exemptReason: null,
        exemptSource: null,
        isFinalized: false,
    };

    if (invoice) {
        Object.assign(invoice, invoiceData);
        invoice.status = determineInvoiceStatus(invoice.paidAmount, invoice.totalPayable);
        if (invoice.isModified()) await invoice.save();
        const invoiceObj = invoice.toObject();
        invoiceObj.remainingAmount = Math.max(0, invoiceObj.totalPayable - invoiceObj.paidAmount);
        return _attachLatestPayment(invoiceObj, userId);
    }

    invoiceData.status = determineInvoiceStatus(invoiceData.paidAmount, invoiceData.totalPayable);
    const created = await Invoice.create(invoiceData);
    const createdObj = created.toObject();
    createdObj.remainingAmount = Math.max(0, createdObj.totalPayable - createdObj.paidAmount);
    return _attachLatestPayment(createdObj, userId);
};

/**
 * ─────────────────────────────────────────────────────────────────────
 * setInvoiceExemption — THE ONLY WAY `exemptOverride` IS EVER WRITTEN
 * ─────────────────────────────────────────────────────────────────────
 * Admin-only, audited. This is the manual control surface for billing
 * exemption; nothing else in the codebase may set these fields.
 *
 * Guards (fintech-grade):
 *  - 'force_exempt' requires a non-empty reason (≥5 chars).
 *  - Cannot exempt an invoice that already has money booked
 *    (paidAmount > 0) — refund first, otherwise the Payment record
 *    would be orphaned. Returns 409 with actionable guidance.
 *  - Works on finalized (closed) periods too — but through this
 *    explicit, audited write path only, never through a read.
 *  - Recomputes the full bill when un-exempting so the restored amount
 *    matches what getInvoice() would produce.
 *
 * @param {string} invoiceId
 * @param {{ override: 'none'|'force_exempt'|'force_bill', reason?: string, adminId: string }} opts
 * @returns {Promise<Object>} hydrated invoice
 */
const setInvoiceExemption = async (invoiceId, { override, reason = null, adminId } = {}) => {
    const normalizedOverride = normalizeOverride(override);
    if (normalizedOverride !== override) {
        throw new AppError('Invalid exemption override', 400);
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

    if (normalizedOverride === OVERRIDE.FORCE_EXEMPT && trimmedReason.length < 5) {
        throw new AppError('A reason of at least 5 characters is required to exempt a bill', 400);
    }

    const isCurrentlyExempt = invoice.isExempt === true;

    if (normalizedOverride === OVERRIDE.FORCE_EXEMPT && !isCurrentlyExempt && (invoice.paidAmount || 0) > 0) {
        throw new AppError(
            `Cannot exempt ${invoice.monthName}: ₹${invoice.paidAmount} has already been recorded. Refund the payment first, then exempt.`,
            409
        );
    }

    const previousOverride = normalizeOverride(invoice.exemptOverride);
    const changed = previousOverride !== normalizedOverride;

    invoice.exemptOverride = normalizedOverride;
    invoice.exemptedBy = adminId || invoice.exemptedBy || null;
    invoice.exemptedAt = new Date();

    if (changed || !invoice.exemptHistory?.length) {
        invoice.exemptHistory = [
            ...(invoice.exemptHistory || []),
            {
                override: normalizedOverride,
                reason: trimmedReason || null,
                changedBy: adminId || null,
                changedAt: new Date(),
            },
        ];
    }

    // Recompute the EFFECTIVE values from the same resolver every read uses.
    // Activity data for this period is already stored on the invoice for open
    // periods we just recalculated; for safety re-derive from live collections.
    const { start, end } = getMonthRange(invoice.month, invoice.year);
    const [userMeals, userMarkets] = await Promise.all([
        Meal.aggregate([
            { $match: { user: invoice.user, date: { $gte: start, $lte: end } } },
            { $group: { _id: null, mealCount: { $sum: '$mealCount' }, guestCount: { $sum: '$guestCount' } } },
        ]),
        Market.aggregate([
            { $match: { user: invoice.user, date: { $gte: start, $lte: end } } },
            { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
        ]),
    ]);

    const resolution = resolveExemption({
        override: normalizedOverride,
        totalMeal: userMeals[0]?.mealCount || 0,
        totalMarketAmount: userMarkets[0]?.totalAmount || 0,
        paidAmount: invoice.paidAmount || 0,
        reason: trimmedReason,
    });

    invoice.isExempt = resolution.isExempt;
    invoice.exemptSource = resolution.exemptSource;
    invoice.exemptReason = resolution.exemptReason;

    if (invoice.isExempt) {
        invoice.totalBill = 0;
        invoice.totalPayable = 0;
        invoice.messCost = 0;
        invoice.guestMealRevenue = 0;
        invoice.mealRate = 0;
        invoice.fixedCosts = { cookingCharge: 0, waterBill: 0, gasBillCharge: 0, platformFee: 0 };
        invoice.status = 'paid';
    } else {
        // Un-exempt: rebuild the bill from live facts so the restored amount
        // is identical to what getInvoice() would have produced.
        const user = await User.findById(invoice.user).lean();
        if (!user) throw new AppError('User not found', 404);

        const messStats = await calculateMessStats(invoice.month, invoice.year);
        const uMealCount = userMeals[0]?.mealCount || 0;
        const uGuestCount = userMeals[0]?.guestCount || 0;
        const uMarketSpent = userMarkets[0]?.totalAmount || 0;
        const uOwnMeals = uMealCount - uGuestCount;

        const messCost = uOwnMeals * messStats.mealRate;
        const guestRevenue = uGuestCount * (user.chargePerGuestMeal || 60);
        const totalBill = messCost
            + (user.cookingCharge || 0)
            + (user.waterBill || 0)
            + (user.platformFee || 0)
            + guestRevenue
            - uMarketSpent;

        invoice.mealCount = uOwnMeals;
        invoice.guestMealCount = uGuestCount;
        invoice.marketAmountSpent = uMarketSpent;
        invoice.mealRate = messStats.mealRate;
        invoice.messCost = Number(messCost.toFixed(2));
        invoice.guestMealRevenue = guestRevenue;
        invoice.fixedCosts = {
            cookingCharge: Number(user.cookingCharge || 0),
            waterBill: Number(user.waterBill || 0),
            gasBillCharge: Number(user.gasBillCharge || 0),
            platformFee: Number(user.platformFee || 0),
        };
        invoice.totalBill = Math.round(totalBill * 100) / 100;
        invoice.totalPayable = Math.round(totalBill * 100) / 100;
        invoice.status = determineInvoiceStatus(invoice.paidAmount || 0, invoice.totalPayable);
    }

    await invoice.save();
    return invoice;
};

/**
 * READ-ONLY lookup of a member's exemption state for one billing period.
 *
 * Used by the admin Edit Member → Billing Exemption control so the admin can
 * browse arbitrary periods WITHOUT minting Invoice documents as a side effect
 * of a GET (getInvoice() creates one when it is missing) and without paying
 * for a mess-wide calculateMessStats aggregate on every panel open.
 *
 * Contract: this function must never write to the database.
 *
 * @param {string} userId
 * @param {number} month — 1-indexed
 * @param {number} year
 * @returns {Promise<{
 *   exists: boolean,
 *   invoiceId: string|null,
 *   override: 'none'|'force_exempt'|'force_bill',
 *   isExempt: boolean,
 *   exemptSource: string|null,
 *   exemptReason: string|null,
 *   isFinalized: boolean,
 *   paidAmount: number
 * }>}
 */
const getInvoiceExemptionStatus = async (userId, month, year) => {
    const invoice = await Invoice.findOne({ user: userId, month, year })
        .select('isExempt exemptSource exemptReason exemptOverride paidAmount isFinalized')
        .lean();

    if (!invoice) {
        return {
            exists: false,
            invoiceId: null,
            override: OVERRIDE.NONE,
            isExempt: false,
            exemptSource: null,
            exemptReason: null,
            isFinalized: false,
            paidAmount: 0,
        };
    }

    return {
        exists: true,
        invoiceId: String(invoice._id),
        override: normalizeOverride(invoice.exemptOverride),
        isExempt: invoice.isExempt === true,
        exemptSource: invoice.isExempt === true ? (invoice.exemptSource || null) : null,
        exemptReason: invoice.isExempt === true ? (invoice.exemptReason || null) : null,
        isFinalized: invoice.isFinalized === true,
        paidAmount: Number(invoice.paidAmount) || 0,
    };
};

/**
 * Calculate total completed payments for a user in a specific month
 */
const calculatePaidAmount = async (userId, month, year) => {
    // FIX: Use Intl.DateTimeFormat with explicit 'en-US' locale to prevent
    // month-name mismatch when server locale is non-English.
    // Previously used toLocaleString('default', ...) which varies by server locale.
    const monthName = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));

    const payments = await Payment.find({
        user: userId,
        month: monthName,
        status: 'completed',
        type: 'mess_bill'
    });
    return payments.reduce((sum, p) => sum + p.amount, 0);
};

/**
 * Get the currently active invoice for a user based on the 10th-day rule
 */
const getActiveInvoice = async (userId) => {
    const { month, year } = getBillingPeriod();
    return getInvoice(userId, month, year);
};

/**
 * Get a specific month's invoice for a user.
 * Used when a user clicks "View Invoice" on a past payment.
 */
const getInvoiceForMonth = async (userId, year, month) => {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!m || m < 1 || m > 12 || !y) throw new AppError('Invalid month or year', 400);
    return getInvoice(userId, m, y);
};

/**
 * Get full invoice history for a user — all stored invoices, newest first.
 */
const getUserInvoiceHistory = async (userId) => {
    return Invoice.find({ user: userId })
        .sort({ year: -1, month: -1 })
        .lean();
};

/**
 * Finalize all invoices for a given month.
 *
 * Exemption is decided ENTIRELY by invoice.isExempt, which is produced by
 * billingExemption.service (admin override, or the zero-activity rule).
 * There is no user-date pre-filter — a member is never silently dropped
 * from finalization because of when their account was created.
 */
const finalizeMonth = async (month, year, adminId) => {
    // Resolve admin ID for refund Payment records (createdBy is required)
    let resolvedAdminId = adminId;
    if (!resolvedAdminId) {
        const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
        resolvedAdminId = admin?._id;
    }

    const activeUsers = await User.find({ isActive: true, userStatus: 'approved' })
        .select('_id')
        .lean();

    const results = [];

    for (const user of activeUsers) {
        // One member's failure (refund ValidationError, save race, etc.) must
        // never abort finalization for every other member.
        try {
            // getInvoice() resolves the effective exemption (admin override or
            // zero-activity). Exempt invoices come back with totalPayable: 0.
            const invoiceObj = await getInvoice(user._id, month, year);

            // Skip exempt invoices — they are handled separately below
            if (invoiceObj.isExempt) continue;

            // Find the invoice as a Mongoose document so .save() works
            const invoice = await Invoice.findOne({ user: user._id, month, year });
            if (!invoice) continue;

            invoice.isFinalized = true;
            invoice.finalizedAt = new Date();

            invoice.status = determineInvoiceStatus(invoice.paidAmount, invoice.totalPayable);

            // Auto-create refund Payment record when totalPayable is negative
            // (user is owed money). Prevents orphaned refund-due invoices.
            if (invoice.totalPayable < 0) {
                const existingRefund = await Payment.findOne({
                    user: invoice.user,
                    month: invoice.monthName,
                    status: 'refunded',
                }).lean();

                if (!existingRefund) {
                    // Detect the original payment type for this user/month
                    const originalPayment = await Payment.findOne({
                        user: invoice.user,
                        month: invoice.monthName,
                        status: 'completed',
                    }).sort({ paymentDate: -1 }).lean();
                    const refundType = originalPayment?.type || 'mess_bill';

                    await Payment.create({
                        user: invoice.user,
                        // totalPayable is negative here; Payment.amount min: 0 —
                        // status:'refunded' carries the sign (see Payment.model).
                        amount: Math.abs(invoice.totalPayable),
                        month: invoice.monthName,
                        type: refundType,
                        status: 'refunded',
                        paymentMethod: 'cash',
                        paymentDate: invoice.finalizedAt || new Date(),
                        createdBy: resolvedAdminId,
                        remarks: `Auto-refund of ₹${Math.abs(invoice.totalPayable).toLocaleString('en-IN', { maximumFractionDigits: 2 })} — user credited during finalization`,
                    });

                    // Sync user payment/gasBill status for the refund
                    const { syncUserPaymentStatus } = require('./payment.service');
                    await syncUserPaymentStatus(invoice.user, refundType, 'refunded', invoice.monthName);
                }
            }

            await invoice.save();
            results.push(invoice.toObject());
        } catch (err) {
            logger.error('[FinalizeMonth] Skipping member after error', {
                userId: String(user._id),
                month,
                year,
                message: err.message,
            });
        }
    }

    // Also finalize exempt invoices (they exist but have zero amounts)
    // These are already marked as isExempt in the database
    const exemptInvoices = await Invoice.find({
        month,
        year,
        isExempt: true,
        isFinalized: false
    });

    for (const invoice of exemptInvoices) {
        try {
            invoice.isFinalized = true;
            invoice.finalizedAt = new Date();
            invoice.status = 'paid'; // Exempt invoices are always "paid"
            await invoice.save();
            results.push(invoice.toObject());
        } catch (err) {
            logger.error('[FinalizeMonth] Skipping exempt invoice after error', {
                invoiceId: String(invoice._id),
                month,
                year,
                message: err.message,
            });
        }
    }

    return results;
};

/**
 * Sync an invoice's paid amount and status
 */
const syncInvoiceStatus = async (invoiceId) => {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return;

    invoice.paidAmount = await calculatePaidAmount(invoice.user, invoice.month, invoice.year);
    
    invoice.status = determineInvoiceStatus(invoice.paidAmount, invoice.totalPayable);

    // Auto-create refund Payment record when totalPayable is negative
    // (prevents orphaned refund-due invoices during re-sync)
    if (invoice.totalPayable < 0) {
        const existingRefund = await Payment.findOne({
            user: invoice.user,
            month: invoice.monthName,
            status: 'refunded',
        }).lean();

        if (!existingRefund) {
            const originalPayment = await Payment.findOne({
                user: invoice.user,
                month: invoice.monthName,
                status: 'completed',
            }).sort({ paymentDate: -1 }).lean();
            const refundType = originalPayment?.type || 'mess_bill';

            // Resolve admin ID for createdBy (required field)
            const admin = await User.findOne({ role: 'admin' }).select('_id').lean();

            await Payment.create({
                user: invoice.user,
                // totalPayable is negative here; Payment.amount min: 0 —
                // status:'refunded' carries the sign (see Payment.model).
                amount: Math.abs(invoice.totalPayable),
                month: invoice.monthName,
                type: refundType,
                status: 'refunded',
                paymentMethod: 'cash',
                paymentDate: invoice.finalizedAt || new Date(),
                createdBy: admin?._id,
                remarks: `Auto-refund of ₹${Math.abs(invoice.totalPayable).toLocaleString('en-IN', { maximumFractionDigits: 2 })} — user credited during sync`,
            });

            const { syncUserPaymentStatus } = require('./payment.service');
            await syncUserPaymentStatus(invoice.user, refundType, 'refunded', invoice.monthName);
        }
    }

    await invoice.save();
    return invoice;
};

/**
 * Resets ALL user billing-cycle fields after the previous month is finalized.
 *
 * On the 11th of every month this:
 *  1. Re-aggregates meal / market totals strictly from the NEW calendar month
 *     (1st of current month → today) so the running counters are accurate.
 *  2. Resets `payment` and `gasBill` flags back to 'pending' so the Members
 *     page correctly reflects the status for the brand-new billing period.
 *  3. Clears the legacy join-date exemption flags. Billing exemption now
 *     lives on the Invoice (admin override / zero-activity), so these
 *     User-level fields are no longer read by any billing path.
 *
 * Implementation notes:
 *  - Uses a single MongoDB `bulkWrite` for all user updates → O(1) round-trips
 *    regardless of member count (fintech-grade, not N+1).
 *  - Runs the Meal + Market aggregations in parallel per user via Promise.all.
 *  - Only targets active users to skip deactivated / denied accounts.
 *
 * @returns {Promise<{ modifiedCount: number, matchedCount: number }>}
 */
const resetUserStatsAfterFinalization = async () => {
    // Start of the current calendar month in UTC (e.g., May 11 → May 1 00:00:00 UTC)
    const today = new Date();
    const currentMonthStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));

    // Fetch only IDs of active users — no need for full documents
    const users = await User.find(
        { isActive: true },
        { _id: 1, gasBillCharge: 1 }
    ).lean();

    if (users.length === 0) return { modifiedCount: 0, matchedCount: 0 };

    // Recalculate per-user gasBillCharge for the new cycle.
    // If the active user count changed (users added/removed), redistribute evenly.
    // Find the canonical per-user charge from any active user with a non-zero value.
    const canonicalGasCharge = users.find(u => u.gasBillCharge > 0)?.gasBillCharge || 0;

    // Check which users already have completed payments for the new billing period
    // to avoid wiping already-paid statuses on cron retry/re-run.
    const { monthName: currentMonthName } = getBillingPeriod();
    const usersWithMessPayments = await Payment.distinct('user', {
        month: currentMonthName, status: 'completed', type: 'mess_bill',
    });
    const usersWithGasPayments = await Payment.distinct('user', {
        month: currentMonthName, status: 'completed', type: 'gas_bill',
    });
    const messPaidSet = new Set(usersWithMessPayments.map(id => id.toString()));
    const gasPaidSet = new Set(usersWithGasPayments.map(id => id.toString()));

    // Build per-user stats in parallel (bounded I/O — Mongoose pools connections)
    const userStats = await Promise.all(
        users.map(async ({ _id }) => {
            const [mealAgg, marketAgg] = await Promise.all([
                Meal.aggregate([
                    { $match: { user: _id, date: { $gte: currentMonthStart } } },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: '$mealCount' },
                            guest: { $sum: '$guestCount' }
                        }
                    }
                ]),
                Market.aggregate([
                    { $match: { user: _id, date: { $gte: currentMonthStart } } },
                    { $group: { _id: null, amount: { $sum: '$amount' } } }
                ])
            ]);

            return {
                _id,
                totalMeal:         mealAgg[0]?.count  || 0,
                guestMeal:         mealAgg[0]?.guest  || 0,
                totalMarketAmount: marketAgg[0]?.amount || 0,
            };
        })
    );

    // Single bulkWrite — one network round-trip to MongoDB for all users
    const bulkOps = userStats.map(({ _id, totalMeal, guestMeal, totalMarketAmount }) => {
        const userIdStr = _id.toString();
        const hasMessPaid = messPaidSet.has(userIdStr);
        const hasGasPaid = gasPaidSet.has(userIdStr);
        return {
            updateOne: {
                filter: { _id },
                update: {
                    $set: {
                        // ── Re-aggregated running counters for new month ──
                        totalMeal,
                        guestMeal,
                        totalMarketAmount,
                        // ── Billing-status reset for new billing cycle ──
                        // Only reset if user hasn't already paid for the new period
                        // (prevents cron retry from wiping already-paid statuses).
                        payment: hasMessPaid ? undefined : 'pending',
                        gasBill: hasGasPaid ? undefined : 'pending',
                        // ── Recalculate gas bill per user for new cycle ──
                        gasBillCharge: canonicalGasCharge,
                    },
                    // ── Clear legacy join-date exemption flags ──
                    // No longer consulted by billing (see billingExemption.service).
                    $unset: {
                        billingExemptMonth: '',
                        billingExemptYear: '',
                    }
                }
            }
        };
    });

    const result = await User.bulkWrite(bulkOps, { ordered: false });
    return { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount };
};


/**
 * Get all unpaid or partially paid invoices for a given month.
 * Admin only. Used for the "Resolve Unpaid Bills" panel.
 * Shows ALL unpaid/partially paid invoices regardless of finalization status,
 * so the admin always sees outstanding debt without depending on the cron schedule.
 * EXCLUDES exempt invoices (admin-set exemption or zero-activity rule).
 * @param {number} month - 1-indexed month (optional, defaults to previous month)
 * @param {number} year  - full year (optional, defaults to last active billing month)
 */
const getAdminUnpaidInvoices = async (month, year) => {
    // FIX: Default to the LAST FINALIZED period instead of the active billing month.
    // This ensures the admin sees the just-finalized month's unpaid bills immediately
    // on day 11+ (billing cycle rollover), instead of seeing an empty current month.
    if (!month || !year) {
        const period = getLastFinalizedPeriod();
        month = period.month;
        year  = period.year;
    }

    const invoices = await Invoice.find({
        month: Number(month),
        year:  Number(year),
        status: { $nin: ['paid', 'refunded'] },
        isExempt: { $ne: true },
        totalPayable: { $gt: 0 }
    })
    .populate('user', 'name email image role isActive activatedAt')
    .sort({ totalPayable: -1 })
    .lean();

    return invoices;
};

/**
 * Send invoice PDF email to all active approved members.
 * Admin only. Generates a personalised binary PDF for each member
 * (mirroring PrintInvoice.jsx layout) and sends it as an attachment.
 *
 * Performance:
 *  - Mess-wide aggregation runs ONCE, not per user.
 *  - Members are processed in parallel batches of 5 to avoid overwhelming
 *    the SMTP server while still being significantly faster than sequential.
 *
 * @param {number} month  - 1-indexed month (1–12)
 * @param {number} year   - full 4-digit year
 * @returns {Promise<{ sent: number, failed: number, errors: string[] }>}
 */
const emailAllInvoices = async (month, year) => {
    const BATCH_SIZE = 5;

    const users = await User.find({ isActive: true, userStatus: 'approved' }).lean();
    const results = { sent: 0, failed: 0, errors: [] };

    /* ── Calculate mess-wide stats once (avoids N redundant DB queries) ── */
    const messStats = await calculateMessStats(month, year);
    const grandTotalMarket = messStats.totalMarketAmount;
    const grandTotalMeal   = messStats.totalMealCount;
    const grandTotalGuest  = messStats.totalGuestCount;

    /* ── Process most-recent completed payment for each member (for PDF payment block) ── */
    // FIX: Use explicit 'en-US' locale — see calculatePaidAmount for rationale
    const monthName = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));

    /* Helper: process a single user — returns true on success */
    const processUser = async (user) => {
        const invoice = await getInvoice(user._id, month, year);

        /* Annotate with mess-wide totals so pdf.service can render stat cards */
        invoice._messGrandTotalMarket = grandTotalMarket;
        invoice._messGrandTotalMeal   = grandTotalMeal;
        invoice._messGrandTotalGuest  = grandTotalGuest;

        /* Attach latest completed payment details for the payment block */
        const latestPayment = await Payment.findOne({
            user:   user._id,
            month:  monthName,
            status: 'completed',
            type:   'mess_bill',
        }).sort({ paymentDate: -1 }).lean();

        if (latestPayment) {
            invoice._paymentMethod  = latestPayment.paymentMethod;
            invoice._transactionId  = latestPayment.transactionId || null;
            invoice._paymentDate    = latestPayment.paymentDate;
        }

        /* Generate per-member PDF */
        const pdfBuffer = await pdfService.generateInvoicePDF(invoice, user);
        const fileName  = `UnitedMess_Invoice_${monthName.replace(/\s+/g, '_')}_${(user.name || 'Member').replace(/\s+/g, '_')}.pdf`;

        /* Send email with PDF attachment */
        await emailService.sendInvoiceEmail(
            user.email,
            user.name,
            monthName,
            pdfBuffer,
            fileName
        );
    };

    /* ── Batch execution ── */
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        const settled = await Promise.allSettled(batch.map(processUser));

        settled.forEach((result, idx) => {
            const user = batch[idx];
            if (result.status === 'fulfilled') {
                results.sent++;
            } else {
                results.failed++;
                results.errors.push(`${user.name} (${user.email}): ${result.reason?.message || String(result.reason)}`);
            }
        });
    }

    return results;
};

module.exports = {
    determineInvoiceStatus,
    SETTLEMENT_TOLERANCE,
    getInvoice,
    getActiveInvoice,
    getInvoiceForMonth,
    getUserInvoiceHistory,
    finalizeMonth,
    calculateMessStats,
    syncInvoiceStatus,
    setInvoiceExemption,
    getInvoiceExemptionStatus,
    resetUserStatsAfterFinalization,
    getAdminUnpaidInvoices,
    emailAllInvoices
};
