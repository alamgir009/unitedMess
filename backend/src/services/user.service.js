const User = require('../models/User.model');
const Payment = require('../models/Payment.model');
const Meal = require('../models/Meal.model');
const Market = require('../models/Market.model');
const AppError = require('../utils/errors/AppError');
const emailService = require('./email.service');
const mongoose = require('mongoose');
const { getBillingPeriod } = require('../utils/helpers/date.helper');

// Constants
const PAYMENT_STATUSES = ['pending', 'success', 'failed'];
const GAS_BILL_STATUSES = ['pending', 'success', 'failed'];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Validation helpers
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;

/**
 * Get user by ID with optimized population
 * @param {string} userId
 * @param {string[]} [populateFields=['markets', 'meals']] - Fields to populate
 */
async function getUserById(userId, populateFields = ['markets', 'meals']) {
    if (!isValidObjectId(userId)) {
        throw new AppError('Invalid user ID format', 400);
    }

    const query = User.findById(userId);

    // Chain population dynamically
    populateFields.forEach(field => {
        if (User.schema.paths[field]) query.populate(field);
    });

    const user = await query.lean().exec(); // Use lean() for read-only ops

    if (!user) throw new AppError('User not found', 404);

    return user;
}

/**
 * Update user profile with transaction safety
 * @param {string} userId
 * @param {Object} updateData
 * @param {boolean} [isAdmin=false] - Whether the requester is an admin (allows role update)
 * @returns {Promise<Object>}
 */
async function updateProfile(userId, updateData, isAdmin = false) {
    if (!isValidObjectId(userId)) {
        throw new AppError('Invalid user ID format', 400);
    }

    const { email, phone, name, image, role, isActive, userStatus } = updateData;
    const updates = {};
    const session = await User.startSession();

    try {
        await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);
            if (!user) throw new AppError('User not found', 404);

            // Email change logic with verification
            if (email && email !== user.email) {
                const emailTaken = await User.isEmailTaken(email, userId);
                if (emailTaken) throw new AppError('Email already in use', 409);

                updates.email = email;
                updates.isEmailVerified = false;
                updates.emailChangedAt = new Date();

                // Queue verification email (don't await in transaction)
                emailService.sendVerificationEmail(email, user.name).catch(console.error);
            }

            // Basic profile updates
            if (name) updates.name = name.trim();
            if (phone) updates.phone = phone;
            if (image !== undefined) updates.image = image;

            // Role update – only if requester is admin
            if (role && isAdmin) updates.role = role;
            
            // isActive update – only if requester is admin
            if (isActive !== undefined && isAdmin) updates.isActive = isActive;

            // userStatus update - only if requester is admin
            if (userStatus && isAdmin) updates.userStatus = userStatus;

            updates.updatedAt = new Date();

            // Atomic update
            await User.findByIdAndUpdate(userId, updates, {
                session,
                new: true,
                runValidators: true
            });
        });

        // Return updated user (without session)
        return User.findById(userId).lean();
    } finally {
        session.endSession();
    }
}

/**
 * Approve user account (admin only) - Optimized with transaction
 * @param {string} userId
 * @param {string} approvedBy
 */
async function approveAccount(userId, approvedBy) {
    if (!isValidObjectId(userId) || !isValidObjectId(approvedBy)) {
        throw new AppError('Invalid ID format', 400);
    }

    const result = await User.findOneAndUpdate(
        {
            _id: userId,
            userStatus: { $ne: 'approved' } // Idempotent check
        },
        {
            $set: {
                userStatus: 'approved',
                isActive: true,
                approvedBy,
                approvedAt: new Date()
            },
            $unset: { deleteIfNotApproved: 1 }
        },
        { new: true }
    );

    if (!result) {
        const user = await User.findById(userId).lean();
        if (!user) throw new AppError('User not found', 404);
        throw new AppError('User is already approved', 400);
    }

    // Fire-and-forget email (don't block response)
    emailService.sendAccountApprovedEmail(result.email, result.name)
        .catch(err => console.error('Approval email failed:', err));

    return result;
}

/**
 * Deny user account (admin only) - Optimized
 * @param {string} userId
 * @param {string} deniedBy
 * @param {string} reason
 */
async function denyAccount(userId, deniedBy, reason) {
    if (!isValidObjectId(userId) || !isValidObjectId(deniedBy)) {
        throw new AppError('Invalid ID format', 400);
    }

    const deleteDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await User.findOneAndUpdate(
        { _id: userId, userStatus: { $ne: 'denied' } },
        {
            $set: {
                userStatus: 'denied',
                isActive: false,
                deniedBy,
                deniedAt: new Date(),
                deleteIfNotApproved: deleteDate,
                denialReason: reason
            }
        },
        { new: true }
    );

    if (!user) {
        const exists = await User.exists({ _id: userId });
        if (!exists) throw new AppError('User not found', 404);
        throw new AppError('User is already denied', 400);
    }

    emailService.sendAccountDeniedEmail(user.email, user.name, reason)
        .catch(err => console.error('Denial email failed:', err));

    return user;
}

/**
 * Update payment status
 * @param {string} userId
 * @param {string} status - 'pending' | 'success' | 'failed'
 */
async function updatePaymentStatus(userId, status) {
    if (!PAYMENT_STATUSES.includes(status)) {
    // if (!['pending', 'success', 'failed'].includes(status)) {
        throw new AppError('Invalid payment status', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    user.payment = status;
    await user.save();

    return user;
}
/**
 * Update gas bill status
 * @param {string} userId
 * @param {string} status - 'pending' | 'success' | 'failed'
 */
async function updateGasBillStatus(userId, status) {
    if (!GAS_BILL_STATUSES.includes(status)) {
        throw new AppError('Invalid gas bill status', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    user.gasBill = status;
    await user.save();

    return user;
}

/**
 * Deactivate user account - Soft delete pattern
 * @param {string} userId
 */
async function deactivateAccount(userId) {
    const user = await User.findByIdAndUpdate(
        userId,
        {
            isActive: false,
            deactivatedAt: new Date()
        },
        { new: true }
    ).lean();

    if (!user) throw new AppError('User not found', 404);
    return user;
}

/**
 * Get all users with optimized pagination and filtering.
 * Important: Returns current billing-month stats (meals/market) for each user.
 */
async function getAllUsers(filters = {}, pagination = {}) {
    const page = Math.max(1, Number(pagination.page) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(pagination.limit) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const { start, end } = getBillingPeriod();

    const query = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== '') acc[key] = value;
        return acc;
    }, {});

    // Use aggregation to fetch current-period stats per user
    // NOTE: No isActive filter is applied by default — the admin sees ALL users.
    // The caller can pass isActive=true/false in the filter object to narrow results.
    const aggregationPipeline = [
        { $match: query },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: 'meals',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$user', '$$userId'] },
                                    { $gte: ['$date', start] },
                                    { $lte: ['$date', end] }
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalMeal: { $sum: '$mealCount' },
                            guestMeal: { $sum: '$guestCount' }
                        }
                    }
                ],
                as: 'mealStats'
            }
        },
        {
            $lookup: {
                from: 'markets',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$user', '$$userId'] },
                                    { $gte: ['$date', start] },
                                    { $lte: ['$date', end] }
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalMarket: { $sum: '$amount' }
                        }
                    }
                ],
                as: 'marketStats'
            }
        },
        {
            $addFields: {
                totalMeal: { $ifNull: [{ $arrayElemAt: ['$mealStats.totalMeal', 0] }, 0] },
                guestMeal: { $ifNull: [{ $arrayElemAt: ['$mealStats.guestMeal', 0] }, 0] },
                totalMarketAmount: { $ifNull: [{ $arrayElemAt: ['$marketStats.totalMarket', 0] }, 0] }
            }
        },
        {
            $project: {
                password: 0,
                __v: 0,
                mealStats: 0,
                marketStats: 0
            }
        }
    ];

    const [users, total] = await Promise.all([
        User.aggregate(aggregationPipeline),
        User.countDocuments(query)  // uses same filters as aggregation
    ]);

    return {
        users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: skip + users.length < total,
            hasPrev: page > 1
        }
    };
}


/**
 * Optimized aggregation using $facet for single-query stats
 */
async function getUserStats() {
    const stats = await User.aggregate([
        {
            $facet: {
                total: [{ $count: 'count' }],
                byStatus: [
                    { $group: { _id: '$userStatus', count: { $sum: 1 } } }
                ],
                byRole: [
                    { $group: { _id: '$role', count: { $sum: 1 } } }
                ],
                byPayment: [
                    { $group: { _id: '$payment', count: { $sum: 1 } } }
                ],
                active: [
                    { $match: { isActive: true } },
                    { $count: 'count' }
                ]
            }
        }
    ]).then(([result]) => result);

    const toMap = (arr, key = '_id') =>
        arr.reduce((acc, item) => ({ ...acc, [item[key]]: item.count }), {});

    return {
        totalUsers: stats.total[0]?.count || 0,
        activeUsers: stats.active[0]?.count || 0,
        userStatus: {
            approved: 0, pending: 0, denied: 0,
            ...toMap(stats.byStatus)
        },
        roles: {
            admin: 0, user: 0,
            ...toMap(stats.byRole)
        },
        paymentStatus: {
            pending: 0, success: 0, failed: 0,
            ...toMap(stats.byPayment)
        }
    };
}

/**
 * Grand total market spend for the ACTIVE billing month only.
 * Queries the Market collection directly — never stale User fields.
 */
async function getGrandTotalMarketAmount() {
    const { start, end } = getBillingPeriod();
    const [result] = await Market.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    return round2(result?.total || 0);
}

/**
 * Grand total meals eaten for the ACTIVE billing month only.
 * Queries the Meal collection directly — never stale User fields.
 */
async function getGrandTotalMeal() {
    const { start, end } = getBillingPeriod();
    const [result] = await Meal.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$mealCount' } } }
    ]);
    return result?.total || 0;
}

/**
 * Meal charge per meal for the ACTIVE billing month only.
 * mealCharge = totalMarket / totalMeals
 */
async function getMealCharge() {
    const { start, end } = getBillingPeriod();

    const [mealResult] = await Meal.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalMeal: { $sum: '$mealCount' }, totalGuest: { $sum: '$guestCount' } } }
    ]);
    const [marketResult] = await Market.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalMarket: { $sum: '$amount' } } }
    ]);

    const totalMeal   = mealResult?.totalMeal   || 0;
    const totalGuest  = mealResult?.totalGuest  || 0;
    const totalMarket = marketResult?.totalMarket || 0;
    const guestRevenue = totalGuest * 60; // default guest meal rate

    const charge = totalMeal > 0 ? (totalMarket - guestRevenue) / totalMeal : 0;
    return round2(charge);
}

/**
 * Combined billing-month stats in one call.
 * Runs two parallel aggregations against Meal + Market collections.
 * @returns {{ grandTotalMeal, grandTotalMarket, mealCharge, billingMonth, month, year }}
 */
async function getBillingMonthStats() {
    const { start, end, month, year, monthName } = getBillingPeriod();

    const [mealAgg, marketAgg] = await Promise.all([
        Meal.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    totalMeal:  { $sum: '$mealCount' },
                    totalGuest: { $sum: '$guestCount' }
                }
            }
        ]),
        Market.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            { $group: { _id: null, totalMarket: { $sum: '$amount' } } }
        ])
    ]);

    const grandTotalMeal   = mealAgg[0]?.totalMeal   || 0;
    const totalGuest       = mealAgg[0]?.totalGuest  || 0;
    const grandTotalMarket = marketAgg[0]?.totalMarket || 0;
    const guestRevenue     = totalGuest * 60;
    const mealCharge = grandTotalMeal > 0
        ? round2((grandTotalMarket - guestRevenue) / grandTotalMeal)
        : 0;

    return {
        grandTotalMeal,
        grandTotalMarket: round2(grandTotalMarket),
        mealCharge,
        billingMonth: monthName,
        month,
        year
    };
}

/**
 * Complex payable calculation with caching opportunity
 */
const getPaybleAmountforMeal = async (userId) => {
    if (!isValidObjectId(userId)) throw new AppError('Invalid user ID', 400);

    // Dynamically require to avoid circular dependencies
    const invoiceService = require('./invoice.service');

    // Get Active Invoice (which applies the 10th-day rule and restricts queries to the correct month's start/end dates)
    const invoice = await invoiceService.getActiveInvoice(userId);
    
    // Get the global mess stats restricted to that same active month
    const messStats = await invoiceService.calculateMessStats(invoice.month, invoice.year);
    
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404);

    // Calculate if user has paid the gas bill for this active month
    const completedGasAuth = await Payment.findOne({
        user: userId,
        status: 'completed',
        month: invoice.monthName,
        type: 'gas_bill'
    }).lean();

    // Rounding logic for continuity
    const rounded = round2(invoice.totalPayable);
    const finalPayable = (rounded - Math.floor(rounded)) >= 0.5
        ? Math.ceil(rounded)
        : rounded;

    // Async update to sync the raw model (fire-and-forget)
    User.findByIdAndUpdate(userId, {
        paybleAmountforMeal: finalPayable,
        lastCalculatedAt: new Date()
    }).catch(console.error);

    return {
        grandTotalMarketAmount: round2(messStats.totalMarketAmount),
        grandTotalMeal: messStats.totalMealCount,
        totalGuestRevenue: round2(messStats.guestRevenue),
        adjustedMealCharge: round2(invoice.mealRate),
        userStats: {
            totalMeal: invoice.mealCount,
            totalMarketAmount: round2(invoice.marketAmountSpent),
            waterBill: round2(invoice.fixedCosts?.waterBill || 0),
            cookingCharge: round2(invoice.fixedCosts?.cookingCharge || 0),
            costOfMeals: round2(invoice.messCost),
            guestMeal: invoice.guestMealCount,
            chargePerGuestMeal: user.chargePerGuestMeal || 60,
            guestMealAmount: round2(invoice.guestMealRevenue),
            platformFee: round2(invoice.fixedCosts?.platformFee || user.platformFee || 0)
        },
        payableAmount: finalPayable,
        paymentStatus: user.payment === 'success' || invoice.status === 'paid' ? 'success' : 'pending',
        gasBillStatus: user.gasBill === 'success' || completedGasAuth ? 'success' : 'pending',
        monthName: invoice.monthName,
    };
};

/**
 * Search with text index (requires MongoDB text index on name+email)
 */
async function searchUsers(searchTerm, pagination = {}) {
    const page = Math.max(1, Number(pagination.page) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(pagination.limit) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const query = searchTerm
        ? { $text: { $search: searchTerm } } // Use text index if available
        : {
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } }
            ]
        };

    const [users, total] = await Promise.all([
        User.find(query)
            .select('-password -__v')
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 })
            .lean(),
        User.countDocuments(query)
    ]);

    return {
        users,
        pagination: {
            page, limit, total,
            pages: Math.ceil(total / limit),
            hasNext: skip + users.length < total,
            hasPrev: page > 1
        }
    };
}

/**
 * Optimized retrieval of payable gas bill
 */
const getPaybleAmountforGasBill = async (userId) => {
    if (!isValidObjectId(userId)) throw new AppError('Invalid user ID', 400);

    // Fetch only the needed fields as a plain JS object for max performance
    const user = await User.findById(userId)
        .select('gasBillCharge gasBill')
        .lean();

    if (!user) throw new AppError('User not found', 404);

    // Dynamically calculate status from actual payment records
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const completedGasAuth = await Payment.findOne({
        user: userId,
        status: 'completed',
        month: currentMonth,
        type: 'gas_bill'
    }).lean();

    return {
        payableAmount: user.gasBillCharge || 0,
        status: user.gasBill === 'success' || completedGasAuth ? 'success' : 'pending'
    };
};

module.exports = {
    getUserById,
    updateProfile,
    approveAccount,
    denyAccount,
    updatePaymentStatus,
    updateGasBillStatus,
    deactivateAccount,
    getAllUsers,
    searchUsers,
    getUserStats,
    getGrandTotalMarketAmount,
    getGrandTotalMeal,
    getMealCharge,
    getBillingMonthStats,
    getPaybleAmountforMeal,
    getPaybleAmountforGasBill
};