const mongoose = require('mongoose');
const Invoice = require('../models/Invoice.model');
const User = require('../models/User.model');
const Meal = require('../models/Meal.model');
const Market = require('../models/Market.model');
const Payment = require('../models/Payment.model');
const AppError = require('../utils/errors/AppError');
const { getBillingPeriod } = require('../utils/helpers/date.helper');

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
    // 1. Check if a finalized invoice already exists
    let invoice = await Invoice.findOne({ user: userId, month, year });
    if (invoice && invoice.isFinalized) {
        // Refresh paidAmount from Payment records even if finalized? 
        // Usually, yes, so they can pay an old invoice.
        const paid = await calculatePaidAmount(userId, month, year);
        if (paid !== invoice.paidAmount) {
            invoice.paidAmount = paid;
            // Update status
            if (invoice.paidAmount >= invoice.totalPayable) invoice.status = 'paid';
            else if (invoice.paidAmount > 0) invoice.status = 'partially_paid';
            else invoice.status = 'unpaid';
            await invoice.save();
        }
        return invoice;
    }

    // 2. If not finalized, calculate the current (dynamic) state
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404);

    const { start, end } = getMonthRange(month, year);
    const messStats = await calculateMessStats(month, year);

    // Calculate user-specific stats for the month
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

    // totalBill = (Your share of food) + fixedCosts - (What you paid for market) + (Your guest costs)
    // Actually, fixed costs (cooking, water, platformFee) are usually per person.
    const totalBill = messCost + (user.cookingCharge || 0) + (user.waterBill || 0) + (user.platformFee || 0) + guestRevenue - uMarketSpent;

    // Carry-over due from the previous month
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    const prevInvoice = await Invoice.findOne({ user: userId, month: previousMonth, year: previousYear });
    const dueCarryOver = prevInvoice ? (prevInvoice.totalPayable - prevInvoice.paidAmount) : 0;

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    const invoiceData = {
        user: userId,
        month,
        year,
        monthName,
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
        totalBill: Number(totalBill.toFixed(2)),
        dueCarryOver: Number(Math.max(0, dueCarryOver).toFixed(2)),
        totalPayable: Number((totalBill + Math.max(0, dueCarryOver)).toFixed(2)),
        paidAmount: await calculatePaidAmount(userId, month, year),
        isFinalized: false
    };

    // Upsert safely: find first to avoid E11000 if an isFinalized:true doc exists but findOneAndUpdate upserts a duplicate
    invoice = await Invoice.findOne({ user: userId, month, year });
    
    if (invoice) {
        if (!invoice.isFinalized) {
            Object.assign(invoice, invoiceData);
            await invoice.save();
        }
        return invoice;
    }

    return await Invoice.create(invoiceData);
};

/**
 * Calculate total completed payments for a user in a specific month
 */
const calculatePaidAmount = async (userId, month, year) => {
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
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
 */
const finalizeMonth = async (month, year) => {
    const users = await User.find({ isActive: true, userStatus: 'approved' });
    const results = [];

    for (const user of users) {
        const invoice = await getInvoice(user._id, month, year);
        invoice.isFinalized = true;
        invoice.finalizedAt = new Date();
        
        // Final status check
        if (invoice.paidAmount >= invoice.totalPayable) invoice.status = 'paid';
        else if (invoice.paidAmount > 0) invoice.status = 'partially_paid';
        else invoice.status = 'unpaid';

        await invoice.save();
        results.push(invoice);
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
    
    // Update status
    if (invoice.paidAmount >= invoice.totalPayable) invoice.status = 'paid';
    else if (invoice.paidAmount > 0) invoice.status = 'partially_paid';
    else invoice.status = 'unpaid';

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
        { _id: 1 }
    ).lean();

    if (users.length === 0) return { modifiedCount: 0, matchedCount: 0 };

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
    const bulkOps = userStats.map(({ _id, totalMeal, guestMeal, totalMarketAmount }) => ({
        updateOne: {
            filter: { _id },
            update: {
                $set: {
                    // ── Re-aggregated running counters for new month ──
                    totalMeal,
                    guestMeal,
                    totalMarketAmount,
                    // ── Billing-status reset for new billing cycle ──
                    // payment & gasBill always revert to 'pending' at cycle start;
                    // admins manually mark them 'success' once the member pays.
                    payment: 'pending',
                    gasBill: 'pending',
                }
            }
        }
    }));

    const result = await User.bulkWrite(bulkOps, { ordered: false });
    return { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount };
};


/**
 * Get all finalized invoices that are unpaid or partially paid for a given month.
 * Admin only. Used for the "Resolve Unpaid Bills" panel.
 * @param {number} month - 1-indexed month (optional, defaults to previous month)
 * @param {number} year  - full year (optional, defaults to last active billing month)
 */
const getAdminUnpaidInvoices = async (month, year) => {
    // If no month/year provided, default to the active billing month (which naturally shifts on the 10th)
    if (!month || !year) {
        const period = getBillingPeriod();
        month = period.month;
        year  = period.year;
    }

    const invoices = await Invoice.find({
        month: Number(month),
        year:  Number(year),
        isFinalized: true,
        status: { $in: ['unpaid', 'partially_paid'] }
    })
    .populate('user', 'name email image role isActive')
    .sort({ totalPayable: -1 })
    .lean();

    return invoices;
};

module.exports = {
    getInvoice,
    getActiveInvoice,
    getInvoiceForMonth,
    getUserInvoiceHistory,
    finalizeMonth,
    calculateMessStats,
    syncInvoiceStatus,
    resetUserStatsAfterFinalization,
    getAdminUnpaidInvoices
};
