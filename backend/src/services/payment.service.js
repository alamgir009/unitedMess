const Payment = require('../models/Payment.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const razorpayService = require('./razorpay.service');
const emailService = require('./email.service');

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const PAYMENT_TO_USER_STATUS = {
    completed: 'success',
    failed: 'failed',
    refunded: 'refunded',
    pending: 'pending',
};

// Fields admin is allowed to update — prevents accidental corruption
const UPDATABLE_FIELDS = ['status', 'remarks', 'receiptUrl', 'month', 'amount'];

const getUserFieldByType = (paymentType) =>
    paymentType === 'gas_bill' ? 'gasBill' : 'payment';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Syncs user.payment or user.gasBill after any payment status change
 */
const syncUserPaymentStatus = async (userId, paymentType, paymentStatus) => {
    const userStatus = PAYMENT_TO_USER_STATUS[paymentStatus];
    if (!userStatus) return; // unknown status — skip

    await User.findByIdAndUpdate(
        userId,
        { [getUserFieldByType(paymentType)]: userStatus }
        // no { new } option — we don't need the returned doc
    );
};

/**
 * Verify user exists — lean existence check, no document fetch
 */
const verifyUserExists = async (userId) => {
    const exists = await User.exists({ _id: userId });
    if (!exists) throw new AppError('User not found', 404);
};

/**
 * Send payment status email — accepts user object directly to avoid
 * an extra DB call. Never throws — email failure must not break payment flow.
 * @param {{ _id, name, email }} user
 * @param {Object} payment - Mongoose doc or plain object
 * @param {string} status  - 'completed' | 'failed' | 'refunded'
 */
const sendPaymentEmail = async (user, payment, status) => {
    try {
        const paymentPlain = payment.toObject ? payment.toObject() : payment;
        await emailService.sendPaymentStatusEmail(
            user.email,
            user.name,
            paymentPlain,
            status
        );
    } catch (err) {
        // Isolated — log only, never propagate
        console.error(`[PaymentEmail] Failed for user ${user._id}: ${err.message}`);
    }
};

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

/**
 * Create a manual/cash payment record
 * Cash payments auto-complete server-side — never trust client status
 */
const createPayment = async (paymentBody) => {
    // Fetch user once — used for existence check, duplicate guard, and email
    const user = await User.findById(paymentBody.user)
        .select('name email payment gasBill')
        .lean();

    if (!user) throw new AppError('User not found', 404);

    // Business rule: cash always completes immediately
    if (paymentBody.paymentMethod === 'cash') {
        paymentBody.status = 'completed';
    }

    // Guard: block duplicate payment if user's relevant status is already 'success'
    if (paymentBody.status === 'completed') {
        const userField   = getUserFieldByType(paymentBody.type);
        const fieldStatus = user[userField]; // 'payment' or 'gasBill'

        if (fieldStatus === 'success') {
            const label = paymentBody.type === 'gas_bill' ? 'Gas bill' : 'Payment';
            throw new AppError(
                `${label} already completed for this user. Raise a refund or contact admin.`,
                409
            );
        }
    }

    const payment = await Payment.create(paymentBody);

    if (payment.status === 'completed') {
        await Promise.all([
            syncUserPaymentStatus(payment.user, payment.type, payment.status),
            sendPaymentEmail(user, payment, 'completed')
        ]);
    }

    return payment;
};

/**
 * Create Razorpay order + pending payment record
 * No user status sync here — payment is still pending
 */
const createOnlinePaymentOrder = async (userId, amount, type) => {
    await verifyUserExists(userId);

    if (!amount || amount <= 0) {
        throw new AppError('Invalid payment amount', 400);
    }

    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order first — if it fails, no DB record is created
    const order = await razorpayService.createOrder(amountInPaise);

    const payment = await Payment.create({
        user: userId,
        amount,
        paymentDate: new Date(),
        month: new Date().toLocaleString('default', {
            month: 'long',
            year: 'numeric',
        }),
        type,
        status: 'pending',
        paymentMethod: 'razorpay',
        transactionId: order.id,
    });

    return { order, payment };
};

// ─────────────────────────────────────────────────────────────
// Verify (Atomic + Idempotent + Race-condition safe)
// ─────────────────────────────────────────────────────────────

/**
 * Verify Razorpay signature → atomically mark completed → sync user status
 * findOneAndUpdate with status:'pending' filter makes this race-condition safe —
 * only one concurrent request can win the atomic update
 */
const verifyOnlinePayment = async ({ orderId, paymentId, signature }) => {
    const isValid = razorpayService.verifyPaymentSignature(orderId, paymentId, signature);
    if (!isValid) throw new AppError('Invalid payment signature', 400);

    // Atomic — only succeeds if status is still 'pending'
    const payment = await Payment.findOneAndUpdate(
        { transactionId: orderId, status: 'pending' },
        {
            status: 'completed',
            transactionId: paymentId,  // replace orderId with actual Razorpay paymentId
            paymentDate: new Date(),
        },
        { new: true }
    );

    // Atomic update returned null — determine why
    if (!payment) {
        const existing = await Payment.findOne(
            { transactionId: orderId },
            { status: 1 }              // select only status — minimal fetch
        ).lean();

        if (!existing) throw new AppError('Payment record not found for this order', 404);
        if (existing.status === 'completed') throw new AppError('Payment already verified', 409);
        throw new AppError('Unable to verify payment at this time', 500);
    }

    // Fetch user once — shared by sync and email
    const user = await User.findById(payment.user)
        .select('name email')
        .lean();

    await Promise.all([
        syncUserPaymentStatus(payment.user, payment.type, payment.status),
        user ? sendPaymentEmail(user, payment, 'completed') : Promise.resolve()
    ]);

    return payment;
};

// ─────────────────────────────────────────────────────────────
// Query
// ─────────────────────────────────────────────────────────────

/**
 * Query payments with pagination metadata
 * populateUser only when admin — avoids unnecessary DB lookup for regular users
 */
const queryPayments = async (filter, options = {}, populateUser = false) => {
    let sort = { paymentDate: -1 };

    if (options.sortBy) {
        const [field, order] = options.sortBy.split(':');
        sort = { [field]: order === 'asc' ? 1 : -1 };
    }

    const limit = parseInt(options.limit, 10) || 10;
    const page = parseInt(options.page, 10) || 1;
    const skip = (page - 1) * limit;

    // Run count and find in parallel
    const [totalResults, results] = await Promise.all([
        Payment.countDocuments(filter),
        Payment.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate(populateUser ? { path: 'user', select: 'name email' } : null)
            .lean(),
    ]);

    return {
        results,
        page,
        limit,
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
    };
};

/**
 * Get single payment — always populate for detail view
 */
const getPaymentById = async (id) => {
    const payment = await Payment.findById(id)
        .populate('user', 'name email')
        .lean();

    if (!payment) throw new AppError('Payment not found', 404);
    return payment;
};

// ─────────────────────────────────────────────────────────────
// Update (admin only)
// ─────────────────────────────────────────────────────────────

/**
 * Update payment — only UPDATABLE_FIELDS allowed
 * Prevents admin from accidentally overwriting user, transactionId, paymentMethod
 */
const updatePaymentById = async (paymentId, updateBody) => {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);

    // Guard: cannot revert completed Razorpay payment to pending
    if (
        payment.paymentMethod === 'razorpay' &&
        payment.status === 'completed' &&
        updateBody.status === 'pending'
    ) {
        throw new AppError('Cannot revert a completed Razorpay payment to pending', 400);
    }

    // Whitelist — only pick safe fields from updateBody
    const safeUpdate = UPDATABLE_FIELDS.reduce((acc, field) => {
        if (updateBody[field] !== undefined) acc[field] = updateBody[field];
        return acc;
    }, {});

    const oldStatus = payment.status;
    Object.assign(payment, safeUpdate);
    await payment.save();

    const statusChanged = safeUpdate.status && safeUpdate.status !== oldStatus;

    if (statusChanged) {
        // Fetch user once — shared by sync and email
        const user = await User.findById(payment.user)
            .select('name email')
            .lean();

        await Promise.all([
            syncUserPaymentStatus(payment.user, payment.type, payment.status),
            user && ['completed', 'failed', 'refunded'].includes(safeUpdate.status)
                ? sendPaymentEmail(user, payment, safeUpdate.status)
                : Promise.resolve()
        ]);
    }

    return payment;
};

// ─────────────────────────────────────────────────────────────
// Delete (admin only)
// ─────────────────────────────────────────────────────────────

/**
 * Delete payment — resets user status field to pending in parallel
 * Blocks deletion of completed Razorpay payments (use refund flow instead)
 */
const deletePaymentById = async (paymentId) => {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new AppError('Payment not found', 404);

    if (payment.paymentMethod === 'razorpay' && payment.status === 'completed') {
        throw new AppError('Cannot delete a completed Razorpay payment', 400);
    }

    await Promise.all([
        payment.deleteOne(),
        syncUserPaymentStatus(payment.user, payment.type, 'pending'),
    ]);

    return payment;
};

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

module.exports = {
    createPayment,
    createOnlinePaymentOrder,
    verifyOnlinePayment,
    queryPayments,
    getPaymentById,
    updatePaymentById,
    deletePaymentById,
    verifyUserExists,
};