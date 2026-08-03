const mongoose = require('mongoose');
const Invoice = require('../models/Invoice.model');
const User = require('../models/User.model');
const Meal = require('../models/Meal.model');
const Market = require('../models/Market.model');
const Payment = require('../models/Payment.model');
const AppError = require('../utils/errors/AppError');
const { getBillingPeriod, getLastFinalizedPeriod } = require('../utils/helpers/date.helper');
const emailService = require('./email.service');
const pdfService   = require('./pdf.service');

/**
 * Determine invoice status from paidAmount and totalPayable.
 * Fintech-grade deterministic logic:
 *  - paidAmount < 0  → refunded (never unpaid)
 *  - paidAmount >= totalPayable && totalPayable > 0 → paid
 *  - paidAmount > 0  → partially_paid
 *  - otherwise       → unpaid
 */
function determineInvoiceStatus(paidAmount, totalPayable) {
    if (paidAmount < 0) return 'refunded';
    if (paidAmount >= totalPayable && totalPayable > 0) return 'paid';
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

    const guestMealRate = 60; 
    const guestRevenue = stats.totalGuestCount * guestMealRate;

    const mealRate = stats.totalMealCount > 0 
        ? (stats.totalMarketAmount - guestRevenue) / stats.totalMealCount 
        : 0;

    return { 
        ...stats, 
        mealRate: Number(mealRate.toFixed(4)), 
        guestRevenue 
    };
};

/**
 * Calculate/Get invoice for a specific user and month
 */
const getInvoice = async (userId, month, year) => {
    let invoice = await Invoice.findOne({ user: userId, month, year });
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404);

    // ── BILLING EXEMPTION — 4-signal check ──
    // If ANY signal is true, user pays ₹0 for this period.
    const billingPeriodStart = new Date(Date.UTC(year, month - 1, 1));
    const { start, end } = getMonthRange(month, year);

    // Signal 1 (cheap): activatedAt set after billing period start
    const exemptByActivatedAt = (
        user.activatedAt && new Date(user.activatedAt) > billingPeriodStart
    );

    // Signal 2 (cheap): billingExemptMonth/Year match (set on Day 1-10 activation)
    const exemptByBillingFlag = (
        user.billingExemptMonth === month && user.billingExemptYear === year
    );

    // Signal 3 (cheap): account created after billing period start
    const exemptByCreatedAt = (
        new Date(user.createdAt) > billingPeriodStart
    );

    // Signal 4 (data-driven, only if 1-3 all fail): zero meals + zero markets
    // = user was inactive during this billing period. Catches pre-deployment
    // users where activatedAt was never set and billingExempt flags were cleared.
    let exemptByNoActivity = false;
    if (!exemptByActivatedAt && !exemptByBillingFlag && !exemptByCreatedAt) {
        const [{ mealCount = 0 } = {}] = await Meal.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
            { $group: { _id: null, mealCount: { $sum: '$mealCount' } } }
        ]);
        const [{ totalAmount = 0 } = {}] = await Market.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
            { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
        ]);
        exemptByNoActivity = (mealCount === 0 && totalAmount === 0);
    }

    const isExempt = exemptByActivatedAt || exemptByBillingFlag || exemptByCreatedAt || exemptByNoActivity;

    let exemptReason = 'Member was inactive during this billing period';
    if (exemptByActivatedAt) exemptReason = 'Member activated after billing period started';
    else if (exemptByBillingFlag) exemptReason = 'Member activated on Day 1-10 — previous month exempt';
    else if (exemptByCreatedAt) exemptReason = 'Member account did not exist during this billing period';
    else if (exemptByNoActivity) exemptReason = 'Member has no meal or market activity in this period';

    // ── FINALIZED INVOICE PATH ──
    if (invoice && invoice.isFinalized) {
        if (isExempt && !invoice.isExempt) {
            invoice.totalBill = 0;
            invoice.totalPayable = 0;
            invoice.paidAmount = 0;
            invoice.messCost = 0;
            invoice.mealCount = 0;
            invoice.guestMealCount = 0;
            invoice.guestMealRevenue = 0;
            invoice.marketAmountSpent = 0;
            invoice.mealRate = 0;
            invoice.fixedCosts = { cookingCharge: 0, waterBill: 0, gasBillCharge: 0, platformFee: 0 };
            invoice.isExempt = true;
            invoice.exemptReason = exemptReason;
            invoice.status = 'paid';
            await invoice.save();
        }

        const invoiceObj = invoice.toObject ? invoice.toObject() : invoice;
        invoiceObj.remainingAmount = Math.max(0, invoiceObj.totalPayable - invoiceObj.paidAmount);
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
    }

    // ── EXEMPT (non-finalized) PATH ──
    if (isExempt) {
        const monthName = new Intl.DateTimeFormat('en-US', {
            month: 'long', year: 'numeric', timeZone: 'UTC',
        }).format(new Date(Date.UTC(year, month - 1, 1)));

        const exemptInvoiceData = {
            user: userId, month, year, monthName,
            mealCount: 0, guestMealCount: 0, marketAmountSpent: 0, mealRate: 0,
            messCost: 0, guestMealRevenue: 0,
            fixedCosts: { cookingCharge: 0, waterBill: 0, gasBillCharge: 0, platformFee: 0 },
            totalBill: 0, totalPayable: 0, paidAmount: 0,
            isExempt: true, exemptReason, status: 'paid', isFinalized: false,
        };

        invoice = await Invoice.findOne({ user: userId, month, year });
        if (invoice) {
            if (!invoice.isFinalized) {
                Object.assign(invoice, exemptInvoiceData);
                await invoice.save();
            }
            const invoiceObj = invoice.toObject ? invoice.toObject() : invoice;
            invoiceObj.remainingAmount = 0;
            return invoiceObj;
        }

        const created = await Invoice.create(exemptInvoiceData);
        const createdObj = created.toObject();
        createdObj.remainingAmount = 0;
        return createdObj;
    }

    // ── NON-EXEMPT: calculate bill ──
    const livePaidAmount = await calculatePaidAmount(userId, month, year);
    const messStats = await calculateMessStats(month, year);

    const userMeals = await Meal.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: null,
                mealCount: { $sum: '$mealCount' },
                guestCount: { $sum: '$guestCount' }
            }
        }
    ]);

    const userMarkets = await Market.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);

    const uMealCount = userMeals[0]?.mealCount || 0;
    const uGuestCount = userMeals[0]?.guestCount || 0;
    const uMarketSpent = userMarkets[0]?.totalAmount || 0;

    const messCost = uMealCount * messStats.mealRate;
    const guestRevenue = uGuestCount * (user.chargePerGuestMeal || 60);

    const totalBill = messCost + (user.cookingCharge || 0) + (user.waterBill || 0) + (user.platformFee || 0) + guestRevenue - uMarketSpent;

    const monthName = new Intl.DateTimeFormat('en-US', {
        month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));

    const invoiceData = {
        user: userId, month, year, monthName,
        mealCount: uMealCount,
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
        totalBill: Math.round(totalBill),
        totalPayable: Math.round(totalBill),
        paidAmount: livePaidAmount,
        isFinalized: false
    };

    invoice = await Invoice.findOne({ user: userId, month, year });
    
    if (invoice) {
        if (!invoice.isFinalized) {
            Object.assign(invoice, invoiceData);
            invoice.status = determineInvoiceStatus(invoice.paidAmount, invoice.totalPayable);
            await invoice.save();
        }
        const invoiceObj = invoice.toObject ? invoice.toObject() : invoice;
        invoiceObj.remainingAmount = Math.max(0, invoiceObj.totalPayable - invoiceObj.paidAmount);
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
    }

    invoiceData.status = determineInvoiceStatus(invoiceData.paidAmount, invoiceData.totalPayable);
    const created = await Invoice.create(invoiceData);
    const createdObj = created.toObject();
    createdObj.remainingAmount = Math.max(0, createdObj.totalPayable - createdObj.paidAmount);
    const latestPayment = await Payment.findOne({
        user: userId, month: invoiceData.monthName, status: 'completed', type: 'mess_bill',
    }).sort({ paymentDate: -1 }).lean();
    if (latestPayment) {
        createdObj._paymentMethod = latestPayment.paymentMethod;
        createdObj._transactionId = latestPayment.transactionId || null;
        createdObj._utr = latestPayment.utr || null;
        createdObj._paymentDate = latestPayment.paymentDate;
    }
    return createdObj;
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
 * Finalize all invoices for a given month
 * Excludes users who are EXEMPT (activated after billing period started)
 */
const finalizeMonth = async (month, year) => {
    // Calculate billing period start to check exemption eligibility
    const billingPeriodStart = new Date(Date.UTC(year, month - 1, 1));

    // Fetch active users and filter out exempt ones
    const allActiveUsers = await User.find({ isActive: true, userStatus: 'approved' }).lean();
    
    // Filter: include only users who were active BEFORE or ON the billing period start
    // Exclude users who are EXEMPT (activated after billing period started)
    const eligibleUsers = allActiveUsers.filter(user => {
        // Signal 1: activatedAt set after billing period start — exempt
        if (user.activatedAt && new Date(user.activatedAt) > billingPeriodStart) return false;
        
        // Signal 2: billingExemptMonth/Year match — exempt
        if (user.billingExemptMonth === month && user.billingExemptYear === year) return false;
        
        // Signal 3: account created after billing period start — exempt
        if (!user.activatedAt && user.createdAt && new Date(user.createdAt) > billingPeriodStart) return false;
        
        // User was active before or on billing period start — eligible
        return true;
    });

    const results = [];

    for (const user of eligibleUsers) {
        // getInvoice applies the full 4-signal exemption check (including
        // data-driven zero-activity check). If the user is exempt, the
        // returned invoice will have isExempt: true and totalPayable: 0.
        const invoiceObj = await getInvoice(user._id, month, year);

        // Skip exempt invoices — they are handled separately below
        if (invoiceObj.isExempt) continue;

        // Find the invoice as a Mongoose document so .save() works
        const invoice = await Invoice.findOne({ user: user._id, month, year });
        if (!invoice) continue;

        invoice.isFinalized = true;
        invoice.finalizedAt = new Date();

        invoice.status = determineInvoiceStatus(invoice.paidAmount, invoice.totalPayable);

        await invoice.save();
        results.push(invoice.toObject());
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
        invoice.isFinalized = true;
        invoice.finalizedAt = new Date();
        invoice.status = 'paid'; // Exempt invoices are always "paid"
        await invoice.save();
        results.push(invoice.toObject());
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
 *  3. Clears billing exemption flags for users who were exempt in the previous period.
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
                    // ── Clear billing exemption flags for new cycle ──
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
 * EXCLUDES exempt invoices (users activated after billing period started).
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
        // EXCLUDE exempt invoices — these users were activated after billing period started
        isExempt: { $ne: true }
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
    getInvoice,
    getActiveInvoice,
    getInvoiceForMonth,
    getUserInvoiceHistory,
    finalizeMonth,
    calculateMessStats,
    syncInvoiceStatus,
    resetUserStatsAfterFinalization,
    getAdminUnpaidInvoices,
    emailAllInvoices
};
