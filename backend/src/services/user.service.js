const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const emailService = require('./email.service');
const mongoose = require('mongoose');

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

    const { email, phone, name, image, role , isActive} = updateData;
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
            if (isActive && isAdmin) updates.isActive = isActive;

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
 * Get all users with optimized pagination and filtering
 * @param {Object} filters
 * @param {Object} pagination - { page, limit }
 */
async function getAllUsers(filters = {}, pagination = {}) {
    const page = Math.max(1, Number(pagination.page) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(pagination.limit) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    // Build query dynamically
    const query = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== '') acc[key] = value;
        return acc;
    }, {});

    // Parallel execution with cursor-based optimization hint
    const [users, total] = await Promise.all([
        User.find(query)
            .select('-password -__v') // Exclude sensitive fields
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 })
            .lean()
            .exec(),
        User.countDocuments(query)
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
 * Optimized financial calculations - Single aggregation
 */
async function getGrandTotalMarketAmount() {
    const [result] = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$totalMarketAmount' } } }
    ]);
    return round2(result?.total || 0);
}

async function getGrandTotalMeal() {
    const [result] = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$totalMeal' } } }
    ]);
    return result?.total || 0;
}

async function getMealCharge() {
    const [result] = await User.aggregate([
        {
            $group: {
                _id: null,
                totalMarket: { $sum: '$totalMarketAmount' },
                totalMeal: { $sum: '$totalMeal' }
            }
        },
        {
            $project: {
                charge: {
                    $cond: [
                        { $eq: ['$totalMeal', 0] },
                        0,
                        { $divide: ['$totalMarket', '$totalMeal'] }
                    ]
                }
            }
        }
    ]);
    return round2(result?.charge || 0);
}

/**
 * Complex payable calculation with caching opportunity
 */
const getPaybleAmountforMeal = async (userId) => {
    if (!isValidObjectId(userId)) throw new AppError('Invalid user ID', 400);

    // Single aggregation for global + user data
    const [globalData, user] = await Promise.all([
        User.aggregate([
            {
                $group: {
                    _id: null,
                    grandTotalMarket: { $sum: '$totalMarketAmount' },
                    grandTotalMeal: { $sum: '$totalMeal' },
                    guestRevenue: {
                        $sum: { $multiply: ['$guestMeal', '$chargePerGuestMeal'] }
                    }
                }
            }
        ]),
        User.findById(userId).lean()
    ]);

    if (!user) throw new AppError('User not found', 404);

    const stats = globalData[0] || { grandTotalMarket: 0, grandTotalMeal: 0, guestRevenue: 0 };

    // Calculate meal rate
    const adjustedMealCharge = stats.grandTotalMeal > 0
        ? (stats.grandTotalMarket - stats.guestRevenue) / stats.grandTotalMeal
        : 0;

    const guestMealAmount = (user.guestMeal || 0) * (user.chargePerGuestMeal || 0);
    const costOfMeals = user.totalMeal * adjustedMealCharge;

    const rawPayable = user.waterBill + user.cookingCharge +
        (costOfMeals - user.totalMarketAmount) + guestMealAmount;

    // Rounding logic
    const rounded = round2(rawPayable);
    const finalPayable = (rounded - Math.floor(rounded)) >= 0.5
        ? Math.ceil(rounded)
        : rounded;

    // Async update (don't await, fire-and-forget)
    User.findByIdAndUpdate(userId, {
        paybleAmountforMeal: finalPayable,
        lastCalculatedAt: new Date()
    }).catch(console.error);

    return {
        grandTotalMarketAmount: round2(stats.grandTotalMarket),
        grandTotalMeal: stats.grandTotalMeal,
        totalGuestRevenue: round2(stats.guestRevenue),
        adjustedMealCharge: round2(adjustedMealCharge),
        userStats: {
            totalMeal: user.totalMeal,
            totalMarketAmount: round2(user.totalMarketAmount),
            waterBill: round2(user.waterBill),
            cookingCharge: round2(user.cookingCharge),
            costOfMeals: round2(costOfMeals),
            guestMeal: user.guestMeal || 0,
            chargePerGuestMeal: user.chargePerGuestMeal || 0,
            guestMealAmount: round2(guestMealAmount)
        },
        payableAmount: finalPayable
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
    getPaybleAmountforMeal
};