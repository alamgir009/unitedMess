const User = require('../models/User.model');
const Payment = require('../models/Payment.model');
const Invoice = require('../models/Invoice.model');

const Meal = require('../models/Meal.model');
const Market = require('../models/Market.model');
const AppError = require('../utils/errors/AppError');
const emailService = require('./email.service');
const mongoose = require('mongoose');
const { getBillingPeriod } = require('../utils/helpers/date.helper');
const notificationService = require('./notification.service');
const { emitToAll } = require('../sockets');
const { resolveEffective } = require('./billingExemption.service');

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
 * ─────────────────────────────────────────────────────────────
 * computePayableAmount — single source of truth for mess bill
 * ─────────────────────────────────────────────────────────────
 * Pure function.  No DB calls.  Takes pre-fetched data and
 * returns { amount, isBilled }.
 *
 * Formula (fintech-grade):
 *   totalBill = ownMeals × mealRate
 *             + cookingCharge + waterBill + platformFee
 *             + guestRevenue
 *             − totalMarketAmount
 *
 * @param {Object}  opts
 * @param {number}  opts.totalMeal        - total meals from Meal collection
 * @param {number}  opts.guestMeal        - guest meals from Meal collection
 * @param {number}  opts.totalMarketAmount - market spend from Market collection
 * @param {number}  opts.mealRate          - global per-own-meal rate
 * @param {number}  opts.cookingCharge     - fixed monthly cooking charge
 * @param {number}  opts.waterBill         - fixed monthly water bill
 * @param {number}  opts.platformFee       - fixed monthly platform fee
 * @param {number}  opts.chargePerGuestMeal- per-guest-meal rate
 * @param {boolean} opts.isInvoiceExempt   - invoice.isExempt flag (authoritative)
 * @param {boolean} opts.isBillingExempt   - effective exemption (admin override or
 *                                           zero-activity) from billingExemption.service
 * @returns {{ amount: number, isBilled: boolean }}
 */
const computePayableAmount = ({
    totalMeal = 0,
    guestMeal = 0,
    totalMarketAmount = 0,
    mealRate = 0,
    cookingCharge = 0,
    waterBill = 0,
    platformFee = 0,
    chargePerGuestMeal = 60,
    isInvoiceExempt = false,
    isBillingExempt = false,
} = {}) => {
    // Exempt = stored invoice flag OR freshly resolved effective exemption.
    // Both derive from billingExemption.service (admin override / zero-activity).
    // If EITHER says exempt, ₹0 is owed.
    if (isInvoiceExempt || isBillingExempt) {
        return { amount: 0, isBilled: false };
    }

    const ownMeals = (totalMeal || 0) - (guestMeal || 0);
    const messCost = ownMeals * (mealRate || 0);
    const guestRevenue = (guestMeal || 0) * (chargePerGuestMeal || 60);
    const fixedCosts = (cookingCharge || 0) + (waterBill || 0) + (platformFee || 0);

    const totalBill = messCost + fixedCosts + guestRevenue - (totalMarketAmount || 0);
    const amount = Math.round(Number(totalBill) || 0);

    return { amount, isBilled: ownMeals > 0 || (guestMeal || 0) > 0 };
};

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

    const applyUpdates = async (user) => {
        // Email change logic with verification
        if (email && email !== user.email) {
            const emailTaken = await User.isEmailTaken(email, userId);
            if (emailTaken) throw new AppError('Email already in use', 409);

            updates.email = email;
            updates.isEmailVerified = false;
            updates.emailChangedAt = new Date();

            emailService.sendVerificationEmail(email, user.name).catch(console.error);
        }

        // Basic profile updates
        if (name) updates.name = name.trim();
        if (phone) updates.phone = phone;
        if (image !== undefined) updates.image = image;

        // Role update – only if requester is admin
        if (role && isAdmin) updates.role = role;
        
        // isActive update – only if requester is admin
        if (isActive !== undefined && isAdmin) {
            const wasInactive = !user.isActive;
            const isActivating = wasInactive && isActive;
            const isDeactivating = user.isActive && !isActive;

            if (isActivating) {
                updates.activatedAt = new Date();
                updates.isActive = true;
                // NOTE: activating a member NEVER sets any exemption.
                // Billing exemption is a manual admin decision made per
                // billing period via invoice.service.setInvoiceExemption().
            } else if (isDeactivating) {
                updates.deactivatedAt = new Date();
                updates.isActive = false;
            } else {
                updates.isActive = isActive;

                if (isActive && !user.activatedAt) {
                    updates.activatedAt = user.createdAt || new Date();
                }
            }
        }

        // userStatus update - only if requester is admin
        if (userStatus && isAdmin) updates.userStatus = userStatus;

        updates.updatedAt = new Date();
    };

    let session;
    try {
        session = await User.startSession();
        await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);
            if (!user) throw new AppError('User not found', 404);
            await applyUpdates(user);
            await User.findByIdAndUpdate(userId, updates, {
                session,
                new: true,
                runValidators: true
            });
        });
    } catch (sessionError) {
        // If sessions are not supported (standalone MongoDB), fall back to non-transactional update
        if (sessionError.message?.includes('Sessions are not supported') || sessionError.name === 'MongoServerError') {
            const user = await User.findById(userId);
            if (!user) throw new AppError('User not found', 404);
            await applyUpdates(user);
            await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
        } else {
            throw sessionError;
        }
    } finally {
        if (session) session.endSession();
    }

    const updatedUser = await User.findById(userId).lean();

    if (updatedUser && updatedUser.isActive) {
        recalculatePayableForUser(userId).catch(console.error);
        emitToAll('billing:updated');
    }

    return updatedUser;
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

    // Inherit current gasBillCharge from any active user so the newly
    // approved member gets the same share as existing members.
    const activeUser = await User.findOne({ isActive: true, gasBillCharge: { $gt: 0 } })
        .select('gasBillCharge')
        .lean();
    const inheritedGasBillCharge = activeUser?.gasBillCharge || 0;

    // NOTE: approving a member NEVER sets a billing exemption.
    // A brand-new member approved on day 1-10 is handled by the
    // zero-activity rule for the previous period (they have no meals),
    // or explicitly by an admin via invoice.service.setInvoiceExemption().
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
                approvedAt: new Date(),
                activatedAt: new Date(),
                gasBillCharge: inheritedGasBillCharge,
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

    notificationService.createAndSend(userId, 'ACCOUNT', 'Account Approved', 'Your account has been approved. You can now use all features.').catch(console.error);

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

    notificationService.createAndSend(userId, 'ACCOUNT', 'Account Denied', `Your account was denied. Reason: ${reason}`).catch(console.error);

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

    notificationService.createAndSend(userId, 'PAYMENT', 'Payment Status Updated', `Your meal payment status is now: ${status}`).catch(console.error);

    return user;
}
/**
 * Update gas bill status
 * @param {string} userId
 * @param {string} status - 'pending' | 'success' | 'failed'
 * @param {string} [changedBy] - ID of admin who made the change (for audit trail)
 */
async function updateGasBillStatus(userId, status, changedBy) {
    if (!GAS_BILL_STATUSES.includes(status)) {
        throw new AppError('Invalid gas bill status', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const oldStatus = user.gasBill;
    user.gasBill = status;

    // Audit trail: track who changed the status and when
    if (!user.gasBillHistory) user.gasBillHistory = [];
    user.gasBillHistory.push({
        status,
        previousStatus: oldStatus,
        changedBy: changedBy || userId,
        changedAt: new Date(),
    });

    await user.save();

    notificationService.createAndSend(userId, 'BILLING', 'Gas Bill Status Updated', `Your gas bill status is now: ${status}`).catch(console.error);

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

    notificationService.sendToAdmins('ACCOUNT', 'User Deactivated', `The account for ${user.name} (${user.email}) has been deactivated.`).catch(console.error);

    return user;
}

/**
 * Get all users with optimized pagination and filtering.
 * Important: Returns current billing-month stats (meals/market) for each user.
 *
 * Exposes `isExempt` for the ACTIVE billing period. The value is the
 * EFFECTIVE exemption produced by billingExemption.service (admin override
 * or zero-activity rule) — the client must never re-derive it.
 */
async function getAllUsers(filters = {}, pagination = {}) {
    const page = Math.max(1, Number(pagination.page) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(pagination.limit) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const query = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== '') acc[key] = value;
        return acc;
    }, {});

    const bp = getBillingPeriod();
    const { start, end } = bp;
    const billingMonth = bp.month;
    const billingYear = bp.year;
    const billingMonthName = bp.monthName;

    // Compute the global meal rate once for all users (avoids N separate calls).
    const invoiceService = require('./invoice.service');
    const messStats = await invoiceService.calculateMessStats(billingMonth, billingYear);
    const mealRate = messStats.mealRate || 0;

    const aggregationPipeline = [
        { $match: query },
        {
            $project: {
                name: 1,
                email: 1,
                image: 1,
                phone: 1,
                role: 1,
                userStatus: 1,
                isActive: 1,
                payment: 1,
                gasBill: 1,
                createdAt: 1,
                activatedAt: 1,
                // ── Invoice / billing fields ──
                guestMeal: 1,
                cookingCharge: 1,
                gasBillCharge: 1,
                waterBill: 1,
                platformFee: 1,
                chargePerGuestMeal: 1,
            }
        },
        { $sort: { name: 1 } }, // Alphabetical sort for member directory
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
        // ── Current-period payment-status lookups ───────────────
        // The Invoice collection is the authoritative per-month
        // source of truth for mess-bill payment status.
        // Gas-bill status is derived from completed Payment records.
        // Without these lookups, the stored user.payment / user.gasBill
        // fields (which may have been set to 'success' by past-period
        // payments before the bug fix) would incorrectly show the
        // current period as paid.
        {
            $lookup: {
                from: 'invoices',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$user', '$$userId'] },
                                    { $eq: ['$month', billingMonth] },
                                    { $eq: ['$year', billingYear] }
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            status: 1,
                            isExempt: 1,
                            exemptReason: 1,
                            exemptSource: 1,
                            exemptOverride: 1
                        }
                    }
                ],
                as: 'currentPeriodInvoice'
            }
        },
        {
            $lookup: {
                from: 'payments',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$user', '$$userId'] },
                                    { $eq: ['$month', billingMonthName] },
                                    { $eq: ['$type', 'gas_bill'] },
                                    { $eq: ['$status', 'completed'] }
                                ]
                            }
                        }
                    },
                    { $limit: 1 },
                    { $project: { _id: 1 } }
                ],
                as: 'gasPayments'
            }
        },
        {
            $lookup: {
                from: 'payments',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$user', '$$userId'] },
                                    { $eq: ['$month', billingMonthName] },
                                    { $eq: ['$type', 'gas_bill'] },
                                    { $eq: ['$status', 'refunded'] }
                                ]
                            }
                        }
                    },
                    { $limit: 1 },
                    { $project: { _id: 1 } }
                ],
                as: 'gasRefundPayments'
            }
        },
        // ── Current-period mess-bill payment lookups ────────────────
        // Mirrors the gas-bill lookups above. Enables the aggregation
        // to detect mess-bill refunds and completions directly from
        // Payment records, without depending on Invoice documents or
        // the stored user.payment field.
        {
            $lookup: {
                from: 'payments',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$user', '$$userId'] },
                                    { $eq: ['$month', billingMonthName] },
                                    { $eq: ['$type', 'mess_bill'] },
                                    { $eq: ['$status', 'completed'] }
                                ]
                            }
                        }
                    },
                    { $limit: 1 },
                    { $project: { _id: 1 } }
                ],
                as: 'messPayments'
            }
        },
        {
            $lookup: {
                from: 'payments',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$user', '$$userId'] },
                                    { $eq: ['$month', billingMonthName] },
                                    { $eq: ['$type', 'mess_bill'] },
                                    { $eq: ['$status', 'refunded'] }
                                ]
                            }
                        }
                    },
                    { $limit: 1 },
                    { $project: { _id: 1 } }
                ],
                as: 'messRefundPayments'
            }
        },
        {
            $addFields: {
                totalMeal: { $ifNull: [{ $arrayElemAt: ['$mealStats.totalMeal', 0] }, 0] },
                guestMeal: { $ifNull: [{ $arrayElemAt: ['$mealStats.guestMeal', 0] }, 0] },
                totalMarketAmount: { $ifNull: [{ $arrayElemAt: ['$marketStats.totalMarket', 0] }, 0] },
                // NOTE: billing exemption is intentionally NOT computed here.
                // It is resolved in the application layer from the stored
                // Invoice (admin override) + zero-activity, via
                // billingExemption.service — the single source of truth.
                // See post-processing below.
                // NOTE: paybleAmountforMeal is computed in application layer
                // AFTER aggregation (see post-processing below).
                // This avoids MongoDB aggregation operator pitfalls and ensures
                // consistency with getPaybleAmountforMeal / getPayableAmountsBatch.
                // ── Mess bill status — fintech-grade cascade ──────────────
                // Derives status from Invoice + Payment records (source of truth).
                // NEVER falls back to the stored user.payment field, which may
                // be stale from a past billing period.
                //
                // Priority:
                //   1. Refunded mess_bill payment exists → 'refunded' (settled —
                //      the payout record is the only ground truth for money
                //      returned, so it beats every other signal)
                //   2. Invoice exempt OR status='paid'   → 'success'
                //   3. Invoice status='refunded' (no payout yet) → 'refund'
                //   4. Completed mess_bill payment exists → 'success'
                //   5. else                              → 'pending'
                payment: {
                    $let: {
                        vars: {
                            invoiceStatus: { $arrayElemAt: ['$currentPeriodInvoice.status', 0] },
                            invoiceExists: { $gt: [{ $size: '$currentPeriodInvoice' }, 0] },
                            isExempt: {
                                $and: [
                                    { $gt: [{ $size: '$currentPeriodInvoice' }, 0] },
                                    { $eq: [{ $arrayElemAt: ['$currentPeriodInvoice.isExempt', 0] }, true] }
                                ]
                            },
                            hasMessRefund: { $gt: [{ $size: { $ifNull: ['$messRefundPayments', []] } }, 0] },
                            hasMessPaid: { $gt: [{ $size: { $ifNull: ['$messPayments', []] } }, 0] },
                        },
                        in: {
                            $cond: {
                                if: '$$hasMessRefund',
                                then: 'refunded',
                                else: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                '$$isExempt',
                                                { $eq: ['$$invoiceStatus', 'paid'] }
                                            ]
                                        },
                                        then: 'success',
                                        else: {
                                            $cond: {
                                                if: { $eq: ['$$invoiceStatus', 'refunded'] },
                                                then: 'refund',
                                                else: {
                                                    $cond: {
                                                        if: '$$hasMessPaid',
                                                        then: 'success',
                                                        else: 'pending'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                // ── Gas bill status — fintech-grade cascade ──────────────
                // Priority:
                //   1. Refunded gas_bill payment exists  → 'refunded' (payout
                //      recorded — settled, NOT 'refund' which means still owed)
                //   2. Completed gas_bill payment exists → 'success'
                //   3. Stored field is 'success' but no payment → 'pending' (stale correction)
                //   4. else → stored user.gasBill (for admin manual toggles)
                gasBill: {
                    $let: {
                        vars: {
                            hasRefundedGas: { $gt: [{ $size: { $ifNull: ['$gasRefundPayments', []] } }, 0] },
                            hasCompletedGas: { $gt: [{ $size: { $ifNull: ['$gasPayments', []] } }, 0] },
                        },
                        in: {
                            $cond: {
                                if: '$$hasRefundedGas',
                                then: 'refunded',
                                else: {
                                    $cond: {
                                        if: '$$hasCompletedGas',
                                        then: 'success',
                                        else: {
                                            $cond: {
                                                if: { $eq: ['$gasBill', 'success'] },
                                                then: 'pending',
                                                else: '$gasBill'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        {
            $project: {
                mealStats: 0,
                marketStats: 0,
                // NOTE: currentPeriodInvoice is intentionally kept for
                // application-layer paybleAmountforMeal computation below.
                gasPayments: 0,
                gasRefundPayments: 0,
                messPayments: 0,
                messRefundPayments: 0
            }
        }
    ];

    const [users, total] = await Promise.all([
        User.aggregate(aggregationPipeline),
        User.countDocuments(query)  // uses same filters as aggregation
    ]);

    // ── Application-layer computation (single source of truth) ────────
    // Resolves ONE effective exemption value per member and drives the
    // payable amount, the Exempt badge and the bill status from it — they
    // can never disagree.
    for (const user of users) {
        const invoice = (
            Array.isArray(user.currentPeriodInvoice) && user.currentPeriodInvoice.length > 0
        ) ? user.currentPeriodInvoice[0] : null;

        // When an Invoice exists it is authoritative: it carries the admin's
        // explicit override AND the denormalized effective flag that the
        // payment-status cascade above also reads. When no invoice has been
        // created yet, fall back to the zero-activity rule.
        const resolution = resolveEffective({
            invoice,
            totalMeal: user.totalMeal,
            totalMarketAmount: user.totalMarketAmount,
        });

        const { amount } = computePayableAmount({
            totalMeal: user.totalMeal,
            guestMeal: user.guestMeal,
            totalMarketAmount: user.totalMarketAmount,
            mealRate,
            cookingCharge: user.cookingCharge,
            waterBill: user.waterBill,
            platformFee: user.platformFee,
            chargePerGuestMeal: user.chargePerGuestMeal,
            isInvoiceExempt: resolution.isExempt,
            isBillingExempt: resolution.isExempt,
        });

        user.isExempt = resolution.isExempt;
        user.exemptSource = resolution.exemptSource;
        user.exemptReason = resolution.exemptReason;
        user.paybleAmountforMeal = amount;

        // Exempt ⇒ nothing is owed, so the bill status must never read "Unpaid".
        if (resolution.isExempt && user.payment !== 'refund') {
            user.payment = 'success';
        }

        // Clean up internal fields that shouldn't leak to the API response
        delete user.currentPeriodInvoice;
    }

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
        { $group: { _id: null, total: { $sum: '$mealCount' }, guestTotal: { $sum: '$guestCount' } } }
    ]);
    return {
        overallMeal: result?.total || 0,
        overallGuestMeal: result?.guestTotal || 0,
    };
}

/**
 * Meal charge per meal for the ACTIVE billing month only.
 * mealCharge = (totalMarket - guestRevenue) / totalOwnMeals
 * Returns the full breakdown so callers can render the formula.
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
    const [settingsUser] = await User.find({ isActive: true, userStatus: 'approved' })
        .select('chargePerGuestMeal').lean();
    const guestMealRate = settingsUser?.chargePerGuestMeal || 60;
    const guestRevenue = totalGuest * guestMealRate;

    const totalOwnMeals = totalMeal - totalGuest;
    const charge = totalOwnMeals > 0 ? (totalMarket - guestRevenue) / totalOwnMeals : 0;
    return {
        mealCharge: round2(charge),
        totalMeal,
        totalGuest,
        totalOwnMeals,
        totalMarket: round2(totalMarket),
        guestMealRate,
        guestRevenue: round2(guestRevenue),
    };
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
    const [settingsUser] = await User.find({ isActive: true, userStatus: 'approved' })
        .select('chargePerGuestMeal').lean();
    const guestMealRate = settingsUser?.chargePerGuestMeal || 60;
    const guestRevenue     = totalGuest * guestMealRate;
    const totalOwnMeals = grandTotalMeal - totalGuest;
    const mealCharge = totalOwnMeals > 0
        ? round2((grandTotalMarket - guestRevenue) / totalOwnMeals)
        : 0;

    return {
        grandTotalMeal,
        grandTotalGuest: totalGuest,
        grandTotalMarket: round2(grandTotalMarket),
        totalOwnMeals: grandTotalMeal - totalGuest,
        guestMealRate,
        mealCharge,
        billingMonth: monthName,
        month,
        year
    };
}

/**
 * Fire-and-forget: recalculate and persist paybleAmountforMeal for a user.
 * Called after every meal/market mutation so the User model always has a
 * fresh value (used by getAllUsers() when returning the user list).
 */
const recalculatePayableForUser = async (userId) => {
    try {
        if (!isValidObjectId(userId)) return;
        const invoiceService = require('./invoice.service');
        const invoice = await invoiceService.getActiveInvoice(userId);
        
        // ── Compute payable using shared helper (single source of truth) ──
        const user = await User.findById(userId).lean();
        if (!user) return;

        const messStats = await invoiceService.calculateMessStats(invoice.month, invoice.year);

        // NOTE: invoice.mealCount stores OWN meals (total-guest). Reconstruct
        // totalMeal for the helper which expects total meals including guests.
        const invoiceOwnMeals = invoice.mealCount || 0;
        const invoiceGuestMeals = invoice.guestMealCount || 0;

        const { amount: computedPayable } = computePayableAmount({
            totalMeal: invoiceOwnMeals + invoiceGuestMeals,
            guestMeal: invoiceGuestMeals,
            totalMarketAmount: invoice.marketAmountSpent,
            mealRate: messStats.mealRate,
            cookingCharge: invoice.fixedCosts?.cookingCharge || 0,
            waterBill: invoice.fixedCosts?.waterBill || 0,
            platformFee: invoice.fixedCosts?.platformFee || user.platformFee || 0,
            chargePerGuestMeal: user.chargePerGuestMeal || 60,
            isInvoiceExempt: invoice.isExempt,
        });

        // For refunded invoices, store the SIGNED net payable (totalPayable - paidAmount)
        // so the frontend refund badge (< 0 check) works from the amount itself.
        // For non-refunded invoices, store the unsigned totalPayable (bill amount).
        const netPayable = invoice.status === 'refunded'
            ? computedPayable - (invoice.paidAmount || 0)
            : computedPayable;
        const finalPayable = Math.round(round2(netPayable));
        await User.findByIdAndUpdate(userId, {
            paybleAmountforMeal: finalPayable,
            lastCalculatedAt: new Date()
        });
    } catch (err) {
        console.error(`[recalculatePayableForUser] Failed for user ${userId}:`, err.message);
    }
};

/**
 * Fire-and-forget: recalculate paybleAmountforMeal for ALL active users.
 * A change to any member's meal count or market amount affects the shared
 * denominator (Total Meal Count) and cost pool (Total Market Cost), which
 * cascades to EVERY member's payable amount. This must be called instead
 * of recalculatePayableForUser after every meal/market mutation.
 */
const recalculateAllActiveUsersPayable = async () => {
    try {
        const activeUsers = await User.find({
            isActive: true,
            userStatus: 'approved',
        }).select('_id').lean();

        await Promise.allSettled(
            activeUsers.map((u) => recalculatePayableForUser(u._id))
        );

        // Notify all connected clients that billing data has been updated
        emitToAll('billing:updated');
    } catch (err) {
        console.error('[recalculateAllActiveUsersPayable] Failed:', err.message);
    }
};

const getPaybleAmountforMeal = async (userId) => {
    if (!isValidObjectId(userId)) throw new AppError('Invalid user ID', 400);

    // Dynamically require to avoid circular dependencies
    const invoiceService = require('./invoice.service');

    // Get Active Invoice (which applies the 10th-day rule and restricts queries to the correct month's start/end dates)
    const invoice = await invoiceService.getActiveInvoice(userId);
    
    // Check if user is exempt for this billing period
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404);

    // Get the global mess stats restricted to that same active month
    const messStats = await invoiceService.calculateMessStats(invoice.month, invoice.year);

    // ── Compute payable amount using shared helper (single source of truth) ──
    // NOTE: invoice.mealCount stores OWN meals (total-guest). Reconstruct
    // totalMeal for the helper which expects total meals including guests.
    const invoiceOwnMeals = invoice.mealCount || 0;
    const invoiceGuestMeals = invoice.guestMealCount || 0;

    const { amount: computedPayable } = computePayableAmount({
        totalMeal: invoiceOwnMeals + invoiceGuestMeals,
        guestMeal: invoiceGuestMeals,
        totalMarketAmount: invoice.marketAmountSpent,
        mealRate: messStats.mealRate,
        cookingCharge: invoice.fixedCosts?.cookingCharge || 0,
        waterBill: invoice.fixedCosts?.waterBill || 0,
        platformFee: invoice.fixedCosts?.platformFee || user.platformFee || 0,
        chargePerGuestMeal: user.chargePerGuestMeal || 60,
        isInvoiceExempt: invoice.isExempt,
    });

    // If invoice is exempt, return zero amounts
    if (invoice.isExempt) {
        return {
            grandTotalMarketAmount: 0,
            grandTotalMeal: 0,
            totalGuestRevenue: 0,
            adjustedMealCharge: 0,
            userStats: {
                totalMeal: 0,
                totalMarketAmount: 0,
                waterBill: 0,
                cookingCharge: 0,
                costOfMeals: 0,
                guestMeal: 0,
                chargePerGuestMeal: user.chargePerGuestMeal || 60,
                guestMealAmount: 0,
                platformFee: 0
            },
            payableAmount: 0,
            paymentStatus: 'success',
            gasBillStatus: 'pending',
            monthName: invoice.monthName,
            isExempt: true,
            exemptReason: invoice.exemptReason
        };
    }
    
    // Settlement lookups for the ACTIVE invoice's month — run in parallel.
    // A refund payout record (status 'refunded') is the ONLY ground truth for
    // "money returned"; invoice.status 'refunded' alone means the credit
    // exists but may still be owed.
    const [completedGasAuth, refundMessAuth, refundGasAuth] = await Promise.all([
        Payment.findOne({
            user: userId,
            status: 'completed',
            month: invoice.monthName,
            type: 'gas_bill'
        }).lean(),
        Payment.findOne({
            user: userId,
            status: 'refunded',
            month: invoice.monthName,
            type: 'mess_bill'
        }).lean(),
        Payment.findOne({
            user: userId,
            status: 'refunded',
            month: invoice.monthName,
            type: 'gas_bill'
        }).lean(),
    ]);

    const finalPayable = computedPayable;

    // Async update to sync the raw model (fire-and-forget)
    User.findByIdAndUpdate(userId, {
        paybleAmountforMeal: finalPayable,
        lastCalculatedAt: new Date()
    }).catch(console.error);

    return {
        grandTotalMarketAmount: round2(messStats.totalMarketAmount),
        grandTotalMeal: messStats.totalMealCount,
        grandTotalGuest: messStats.totalGuestCount,
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
        // 'refunded' = payout recorded (settled) → surfaces show "Refunded";
        // 'refund'   = credit exists, money still owed → "Refund Due".
        paymentStatus: refundMessAuth ? 'refunded'
            : invoice.status === 'refunded' ? 'refund'
            : invoice.status === 'paid' ? 'success'
            : 'pending',
        gasBillStatus: refundGasAuth ? 'refunded'
            : completedGasAuth ? 'success'
            : 'pending',
        monthName: invoice.monthName,
    };
};

/**
 * Merge the ACTIVE billing period's effective exemption onto a plain user
 * list. Keeps search results consistent with getAllUsers() so the Exempt
 * badge never disappears (or reappears wrongly) after a search.
 *
 * @param {Array<Object>} users — lean user docs (mutated in place)
 * @returns {Promise<Array<Object>>}
 */
const attachBillingExemption = async (users) => {
    if (!Array.isArray(users) || users.length === 0) return users || [];

    const { month, year, start, end } = getBillingPeriod();
    const ids = users.map(u => u._id);

    const [invoices, mealGroups, marketGroups] = await Promise.all([
        Invoice.find({ user: { $in: ids }, month, year })
            .select('isExempt exemptSource exemptReason exemptOverride paidAmount')
            .lean(),
        Meal.aggregate([
            { $match: { user: { $in: ids }, date: { $gte: start, $lte: end } } },
            { $group: { _id: '$user', totalMeal: { $sum: '$mealCount' } } },
        ]),
        Market.aggregate([
            { $match: { user: { $in: ids }, date: { $gte: start, $lte: end } } },
            { $group: { _id: '$user', totalMarketAmount: { $sum: '$amount' } } },
        ]),
    ]);

    const invoiceByUser = new Map(invoices.map(inv => [String(inv.user), inv]));
    const mealByUser = new Map(mealGroups.map(g => [String(g._id), g.totalMeal || 0]));
    const marketByUser = new Map(marketGroups.map(g => [String(g._id), g.totalMarketAmount || 0]));

    for (const user of users) {
        const key = String(user._id);
        const invoice = invoiceByUser.get(key) || null;

        const resolution = resolveEffective({
            invoice,
            totalMeal: mealByUser.get(key) || 0,
            totalMarketAmount: marketByUser.get(key) || 0,
        });

        user.isExempt = resolution.isExempt;
        user.exemptSource = resolution.exemptSource;
        user.exemptReason = resolution.exemptReason;

        if (resolution.isExempt && user.payment !== 'refund') {
            user.payment = 'success';
        }
    }

    return users;
};

/**
 * Search with text index (requires MongoDB text index on name+email)
 */
async function searchUsers(searchTerm, pagination = {}) {
    const page  = Math.max(1, Number(pagination.page)  || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(pagination.limit) || DEFAULT_LIMIT));
    const skip  = (page - 1) * limit;

    /**
     * Try $text search first (fast, requires a MongoDB text index on name+email).
     * If the index doesn't exist the driver throws a MongoServerError — catch it
     * and fall back to the slower but always-available $regex approach.
     */
    const buildTextQuery  = () => ({ $text: { $search: searchTerm } });
    const buildRegexQuery = () => ({
        $or: [
            { name:  { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
        ],
    });

    const runQuery = async (query) => {
        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password -__v')
                .limit(limit)
                .skip(skip)
                .sort({ createdAt: -1 })
                .lean(),
            User.countDocuments(query),
        ]);

        // Exemption must follow the same rules as the full member list.
        await attachBillingExemption(users).catch(err => {
            console.error('[searchUsers] Failed to attach exemption:', err.message);
        });

        return {
            users,
            pagination: {
                page, limit, total,
                pages: Math.ceil(total / limit),
                hasNext: skip + users.length < total,
                hasPrev: page > 1,
            },
        };
    };

    try {
        // Attempt text-index search
        return await runQuery(buildTextQuery());
    } catch (err) {
        // Fallback: if text index is missing (code 27) use regex; re-throw anything else
        if (err.code === 27 || err.codeName === 'IndexNotFound' || /text index/i.test(err.message)) {
            return await runQuery(buildRegexQuery());
        }
        throw err;
    }
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

    // CRITICAL: use getBillingPeriod() — NOT new Date() — so the
    // gas bill status check matches the BILLING month, not the current
    // calendar month (important on days 1–10 of a new month).
    const { monthName: billingMonthName } = getBillingPeriod();

    const [completedGasAuth, refundGasAuth] = await Promise.all([
        Payment.findOne({
            user: userId,
            status: 'completed',
            month: billingMonthName,
            type: 'gas_bill'
        }).lean(),
        Payment.findOne({
            user: userId,
            status: 'refunded',
            month: billingMonthName,
            type: 'gas_bill'
        }).lean(),
    ]);

    return {
        payableAmount: user.gasBillCharge || 0,
        // Use payment records as source of truth — never trust the stored
        // user.gasBill field which may have been set to 'success' by a
        // past-period payment (the pre-fix bug). A refund payout record
        // means the gas credit was returned → 'refunded' (settled),
        // distinct from 'refund' (still owed).
        status: refundGasAuth ? 'refunded' : completedGasAuth ? 'success' : 'pending',
        monthName: billingMonthName,
    };
};

/**
 * Batch-fetch payable amounts for multiple users with inline computation.
 * Returns a map: { [userId]: { messPayable, gasPayable, messStatus, gasStatus, monthName } }
 * messPayable is SIGNED: >0 due, 0 settled, <0 refund credit (clamping it to 0
 * hides the refund balance the dashboard/members pages rely on).
 *
 * Fintech-grade: Computes messPayable directly from meal/market data —
 * does NOT depend on Invoice documents existing. Shares the expensive
 * calculateMessStats() across all users (1 call instead of N).
 *
 * For 11 users: ~25 parallel DB queries, completes in ~100-200ms.
 */
const getPayableAmountsBatch = async (userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return {};

    const validIds = userIds.filter(id => isValidObjectId(id));
    if (validIds.length === 0) return {};

    const invoiceService = require('./invoice.service');
    const { month: bpMonth, year: bpYear, monthName: billingMonthName, start: periodStart, end: periodEnd } = getBillingPeriod();

    // ── Phase 1: Shared queries (run once, not per-user) ──
    const [users, messStats, allPayments, invoices] = await Promise.all([
        // 1. All users with billing-relevant fields
        User.find({ _id: { $in: validIds } })
            .select('_id gasBillCharge cookingCharge waterBill platformFee chargePerGuestMeal')
            .lean(),
        // 2. Mess-wide stats (shared across all users — meal rate calculation)
        invoiceService.calculateMessStats(bpMonth, bpYear),
        // 3. All completed payments for these users in the billing period
        Payment.find({
            user: { $in: validIds },
            month: billingMonthName,
            status: 'completed',
            type: { $in: ['mess_bill', 'gas_bill'] },
        }).select('user type amount').lean(),
        // 4. Stored invoices for the active period — carry the admin's
        //    explicit exemption override (the ONLY manual control surface).
        Invoice.find({ user: { $in: validIds }, month: bpMonth, year: bpYear })
            .select('user isExempt exemptSource exemptReason exemptOverride paidAmount')
            .lean(),
    ]);

    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    const invoiceMap = new Map(invoices.map(inv => [inv.user.toString(), inv]));

    // Pre-compute payment totals per user — mess and gas tracked SEPARATELY.
    // A paid gas bill must never reduce the mess billable that the Record
    // Payment modal auto-fills (both types share a billing month).
    const paidTotals = new Map(); // userId -> { messTotal, hasMess, hasGas }
    for (const p of allPayments) {
        const uid = p.user.toString();
        if (!paidTotals.has(uid)) paidTotals.set(uid, { messTotal: 0, hasMess: false, hasGas: false });
        const entry = paidTotals.get(uid);
        if (p.type === 'mess_bill') {
            entry.messTotal += p.amount || 0;
            entry.hasMess = true;
        } else if (p.type === 'gas_bill') {
            entry.hasGas = true;
        }
    }

    // ── Phase 2: Per-user computation (all in parallel) ──
    // Each user is wrapped in its own try-catch so one failure doesn't kill the batch.
    const userComputations = validIds.map(async (userId) => {
        try {
            const uid = userId.toString();
            const user = userMap.get(uid);
            if (!user) return null;

            const paymentInfo = paidTotals.get(uid) || { messTotal: 0, hasMess: false, hasGas: false };
            const userObjectId = new mongoose.Types.ObjectId(userId);

            // ── Fetch per-user meal/market data ──
            const [mealAgg, marketAgg] = await Promise.all([
                Meal.aggregate([
                    { $match: { user: userObjectId, date: { $gte: periodStart, $lte: periodEnd } } },
                    { $group: { _id: null, mealCount: { $sum: '$mealCount' }, guestCount: { $sum: '$guestCount' } } },
                ]),
                Market.aggregate([
                    { $match: { user: userObjectId, date: { $gte: periodStart, $lte: periodEnd } } },
                    { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
                ]),
            ]);

            const userMealCount = mealAgg[0]?.mealCount || 0;
            const userGuestCount = mealAgg[0]?.guestCount || 0;
            const userMarketSpent = marketAgg[0]?.totalAmount || 0;

            // ── Effective exemption — same resolver as the member list ──
            const { isExempt } = resolveEffective({
                invoice: invoiceMap.get(uid) || null,
                totalMeal: userMealCount,
                totalMarketAmount: userMarketSpent,
                paidAmount: paymentInfo.messTotal || 0,
            });

            const { amount: totalBill } = computePayableAmount({
                totalMeal: userMealCount,
                guestMeal: userGuestCount,
                totalMarketAmount: userMarketSpent,
                mealRate: messStats.mealRate,
                cookingCharge: user.cookingCharge || 0,
                waterBill: user.waterBill || 0,
                platformFee: user.platformFee || 0,
                chargePerGuestMeal: user.chargePerGuestMeal || 60,
                isInvoiceExempt: isExempt,
                isBillingExempt: isExempt,
            });

            if (isExempt) {
                return {
                    uid,
                    messPayable: 0,
                    gasPayable: user.gasBillCharge || 0,
                    messStatus: paymentInfo.hasMess ? 'success' : 'pending',
                    gasStatus: paymentInfo.hasGas ? 'success' : 'pending',
                    monthName: billingMonthName,
                    isExempt: true,
                };
            }

            // Signed mess balance — NEVER clamp: >0 due, 0 settled, <0 refund credit.
            const messPayable = Number.isFinite(totalBill)
                ? totalBill - (paymentInfo.messTotal || 0)
                : 0;

            return {
                uid,
                messPayable,
                gasPayable: user.gasBillCharge || 0,
                messStatus: paymentInfo.hasMess ? 'success' : 'pending',
                gasStatus: paymentInfo.hasGas ? 'success' : 'pending',
                monthName: billingMonthName,
                isExempt: false,
            };
        } catch (err) {
            console.error(`[getPayableAmountsBatch] Failed for user ${userId}:`, err.message);
            return null;
        }
    });

    const results = await Promise.all(userComputations);

    const result = {};
    for (const r of results) {
        if (r) result[r.uid] = r;
    }
    return result;
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
    getPaybleAmountforGasBill,
    getPayableAmountsBatch,
    recalculatePayableForUser,
    recalculateAllActiveUsersPayable,
};