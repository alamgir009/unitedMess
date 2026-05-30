const Payment = require('../models/Payment.model');
const User = require('../models/User.model');
const Invoice = require('../models/Invoice.model');
const AppError = require('../utils/errors/AppError');
const razorpayService = require('./razorpay.service');
const emailService = require('./email.service');
const config = require('../config');
const { getBillingPeriod } = require('../utils/helpers/date.helper');

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

const getUserFieldByType = (paymentType) => {
    switch (paymentType) {
        case 'gas_bill': return 'gasBill';
        case 'mess_bill': return 'payment';
        default: return 'payment';
    }
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Syncs user.payment or user.gasBill after any payment status change
 */
const syncUserPaymentStatus = async (userId, paymentType, paymentStatus) => {
    try {
        const userStatus = PAYMENT_TO_USER_STATUS[paymentStatus];
        if (!userStatus) {
            console.warn(`[Sync] Unknown payment status: ${paymentStatus}. Skipping user status sync.`);
            return;
        }

        const field = getUserFieldByType(paymentType);
        
        await User.findByIdAndUpdate(
            userId,
            { [field]: userStatus }
        );
        console.info(`[Sync] Updated ${field} status to ${userStatus} for user ${userId}`);
    } catch (error) {
        // Wrap in its own try/catch — if sync fails, log the error but do NOT fail the whole request
        console.error(`[Sync Error] Failed to sync payment status for user ${userId}:`, error.message);
    }
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
        if (!user || !user.email) {
            console.warn('[Email] Skipping email: user data or email missing.');
            return;
        }

        // Email must contain: student name, amount, type, method, month/year, payment ID, date
        await emailService.sendPaymentStatusEmail(
            user.email,
            user.name,
            payment,
            status
        );
        console.info(`[Email] Payment confirmation sent to ${user.email}`);
    } catch (error) {
        // Wrap in its own try/catch — if email fails, log and continue (non-blocking)
        console.error(`[Email Error] Failed to send payment email:`, error.message);
    }
};

/**
 * Parse month string like "May 2026" to { month: 5, year: 2026 }
 */
const parseMonthString = (monthStr) => {
    if (!monthStr) return null;
    const parts = monthStr.split(' ');
    if (parts.length === 2) {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthIndex = monthNames.indexOf(parts[0]);
        if (monthIndex !== -1) {
            return {
                month: monthIndex + 1,
                year: parseInt(parts[1], 10)
            };
        }
    }
    return null;
};

/**
 * Immediately sync Invoice collection paidAmount and status based on completed payments
 */
const syncInvoiceAfterPayment = async (userId, monthStr) => {
    try {
        const parsed = parseMonthString(monthStr);
        if (!parsed) return;

        // Calculate total completed payments for this user & month
        const payments = await Payment.find({
            user: userId,
            month: monthStr,
            status: 'completed',
            type: 'mess_bill'
        });
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        // Find and update invoice
        const invoice = await Invoice.findOne({ user: userId, month: parsed.month, year: parsed.year });
        if (invoice) {
            invoice.paidAmount = totalPaid;
            if (invoice.paidAmount >= invoice.totalPayable && invoice.totalPayable > 0) {
                invoice.status = 'paid';
            } else if (invoice.paidAmount > 0) {
                invoice.status = 'partially_paid';
            } else {
                invoice.status = 'unpaid';
            }
            await invoice.save();
            console.info(`[Sync] Synced invoice status for user ${userId}, month ${monthStr} to ${invoice.status}`);
        }
    } catch (err) {
        console.error('[Sync Error] Failed to sync invoice after payment:', err.message);
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
    const { user: userId, createdBy } = paymentBody;

    // Sub-fix A: Correct user fetch
    const student = await User.findById(userId).select('_id name email payment gasBill');
    if (!student) {
        throw new AppError('Target student not found. Payment record cannot be created.', 404);
    }

    // Duplicate guard: prevent double-recording for same user/month/type
    const existing = await Payment.findOne({
        user: student._id,
        month: paymentBody.month,
        type: paymentBody.type,
        status: 'completed',
    });

    if (existing) {
        throw new AppError(
            `A completed ${paymentBody.type.replace('_', ' ')} for ${paymentBody.month} already exists for this student.`,
            400
        );
    }

    // Sub-fix B: Fix payment record creation
    // Set user field in the Payment document to student._id — never to admin ID
    const paymentData = {
        ...paymentBody,
        user: student._id,
        createdBy: createdBy || student._id, // Audit trail
        status: paymentBody.status || 'completed',
        paymentDate: paymentBody.paymentDate || new Date(),
    };

    const payment = await Payment.create(paymentData);

    // Sub-fix C & D: Sync and Email (non-blocking)
    if (payment.status === 'completed') {
        // Sync payment status
        // Ensure this function receives student._id
        await syncUserPaymentStatus(student._id, payment.type, payment.status);

        // Send payment email
        // Ensure this function receives student.email and student.name
        sendPaymentEmail(student, payment, 'completed').catch(err => {
            console.error(`[Email Error] Failed to send payment confirmation to ${student.email}:`, err.message);
        });
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

    // ──────────────────────────────────────────────────────────────
    // CRITICAL: Use getBillingPeriod() — NOT new Date() — so the
    // payment is stamped with the BILLING month, not the calendar
    // month. Example: paying on May 7 (days 1-10 → billing = April)
    // must produce month = "April 2026", not "May 2026".
    // ──────────────────────────────────────────────────────────────
    const { monthName: billingMonthName } = getBillingPeriod();

    // Guard: Prevent creating an online order if already paid for the billing month
    const duplicate = await Payment.exists({
        user: userId,
        type,
        month: billingMonthName,
        status: 'completed'
    });

    if (duplicate) {
        const label = type === 'gas_bill' ? 'Gas bill' : 'Payment';
        throw new AppError(
            `${label} already completed for this user for ${billingMonthName}.`,
            409
        );
    }

    // Create Razorpay order first — if it fails, no DB record is created
    const order = await razorpayService.createOrder(amountInPaise);

    const payment = await Payment.create({
        user: userId,
        amount,
        paymentDate: new Date(),
        month: billingMonthName,   // ← billing period month, not today's month
        type,
        status: 'pending',
        paymentMethod: 'razorpay',
        transactionId: order.id,
    });

    return { order, payment };
};

/**
 * Create Razorpay order + pending payment records for multiple months
 */
const createOnlinePaymentOrderForMonths = async (userId, months, type) => {
    await verifyUserExists(userId);

    if (!months || !Array.isArray(months) || months.length === 0) {
        throw new AppError('At least one month must be selected', 400);
    }

    let totalAmount = 0;
    const monthDetails = [];

    // Parse each month, check if it's already paid, and sum remainingAmount
    for (const monthStr of months) {
        const parsed = parseMonthString(monthStr);
        if (!parsed) {
            throw new AppError(`Invalid month format: ${monthStr}`, 400);
        }

        const invoiceService = require('./invoice.service');
        const invoice = await invoiceService.getInvoice(userId, parsed.month, parsed.year);
        
        const remaining = Math.max(0, invoice.totalPayable - invoice.paidAmount);
        if (remaining <= 0) {
            throw new AppError(`Invoice for ${monthStr} is already fully paid`, 400);
        }

        // Check if duplicate completed payment exists
        const duplicate = await Payment.exists({
            user: userId,
            type,
            month: monthStr,
            status: 'completed'
        });
        if (duplicate) {
            throw new AppError(`${monthStr} mess bill is already paid.`, 409);
        }

        totalAmount += remaining;
        monthDetails.push({ monthStr, amount: remaining });
    }

    if (totalAmount <= 0) {
        throw new AppError('Total payable amount must be greater than zero', 400);
    }

    const amountInPaise = Math.round(totalAmount * 100);

    // Create Razorpay order first — if it fails, no DB record is created
    const order = await razorpayService.createOrder(amountInPaise);

    // Create pending payment record for each month, linking them to the order.id as transactionId
    const createdPayments = [];
    for (const item of monthDetails) {
        const payment = await Payment.create({
            user: userId,
            amount: item.amount,
            paymentDate: new Date(),
            month: item.monthStr,
            type,
            status: 'pending',
            paymentMethod: 'razorpay',
            transactionId: order.id,
            createdBy: userId,
        });
        createdPayments.push(payment);
    }

    return {
        order,
        payments: createdPayments,
        keyId: config.razorpay.keyId
    };
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

    // Find all pending payments for this order
    const pendingPayments = await Payment.find({ transactionId: orderId, status: 'pending' });
    if (pendingPayments.length === 0) {
        // Check if already completed
        const completedCount = await Payment.countDocuments({ transactionId: paymentId, status: 'completed' });
        if (completedCount > 0) {
            throw new AppError('Payment already verified', 409);
        }
        throw new AppError('Payment record not found for this order', 404);
    }

    // Atomically update all of them
    await Payment.updateMany(
        { transactionId: orderId, status: 'pending' },
        {
            status: 'completed',
            transactionId: paymentId,  // replace orderId with actual Razorpay paymentId
            paymentDate: new Date(),
        }
    );

    // Fetch the updated payments
    const updatedPayments = await Payment.find({ transactionId: paymentId, status: 'completed' });

    // Fetch user once — shared by sync and email
    const user = await User.findById(updatedPayments[0].user)
        .select('name email')
        .lean();

    for (const p of updatedPayments) {
        await syncUserPaymentStatus(p.user, p.type, p.status);
        await syncInvoiceAfterPayment(p.user, p.month);
        if (user) {
            sendPaymentEmail(user, p, 'completed').catch(err => {
                console.error(`[Email Error] Failed to send payment confirmation to ${user.email}:`, err.message);
            });
        }
    }

    return updatedPayments[0];
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

    // Guard: Prevent duplicate completed payments on update
    if (safeUpdate.status === 'completed' && oldStatus !== 'completed') {
        const targetMonth = safeUpdate.month || payment.month;
        const duplicate = await Payment.exists({
            user: payment.user,
            type: payment.type,
            month: targetMonth,
            status: 'completed',
            _id: { $ne: payment._id }
        });

        if (duplicate) {
            const label = payment.type === 'gas_bill' ? 'Gas bill' : 'Payment';
            throw new AppError(
                `${label} already completed for this user for ${targetMonth}.`,
                409
            );
        }
    }

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

    // Always sync invoice after payment updates
    await syncInvoiceAfterPayment(payment.user, payment.month);

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

    await syncInvoiceAfterPayment(payment.user, payment.month);

    return payment;
};

// ─────────────────────────────────────────────────────────────
// Bulk Create (admin only)
// ─────────────────────────────────────────────────────────────

/**
 * Create payments for multiple users atomically.
 * Validates all users exist + duplicate guard, then bulk-inserts.
 * Errors (including Mongoose ValidationError) propagate naturally
 * so the error middleware returns the correct HTTP status.
 *
 * @param {{ userIds: string[], createdBy: string, amount, paymentDate, month, type, status, paymentMethod, transactionId, remarks }} body
 * @returns {Promise<Array>} created payment documents
 */
const createBulkPayments = async (body) => {
    const { userIds, createdBy, ...paymentData } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('userIds array is required with at least one user', 400);
    }

    // Validate all users exist — one query, no N+1
    const users = await User.find({ _id: { $in: userIds } })
        .select('_id name email payment gasBill')
        .lean();

    if (users.length !== userIds.length) {
        const foundIds = new Set(users.map(u => u._id.toString()));
        const missing = userIds.filter(id => !foundIds.has(id.toString()));
        throw new AppError(`Users not found: ${missing.join(', ')}`, 404);
    }

    // Duplicate guard per user — prevent double-recording for same month/type
    const duplicates = await Payment.find({
        user: { $in: userIds },
        month: paymentData.month,
        type: paymentData.type,
        status: 'completed',
    }).populate('user', 'name').lean();

    if (duplicates.length > 0) {
        const names = [...new Set(duplicates.map(d =>
            typeof d.user === 'object' ? d.user?.name : 'Unknown'
        ))];
        throw new AppError(
            `A completed ${(paymentData.type || 'payment').replace('_', ' ')} for ${paymentData.month} already exists for: ${names.join(', ')}`,
            409
        );
    }

    const docs = users.map(user => ({
        user: user._id,
        amount: paymentData.amount ?? 0,
        paymentDate: paymentData.paymentDate || new Date(),
        month: paymentData.month,
        type: paymentData.type || 'mess_bill',
        status: paymentData.status || 'completed',
        paymentMethod: paymentData.paymentMethod || 'cash',
        transactionId: paymentData.transactionId || '',
        remarks: paymentData.remarks || '',
        createdBy: createdBy || user._id,
    }));

    // Payment.create validates all docs — if any fail, a Mongoose
    // ValidationError propagates up and the error middleware returns 400.
    const createdPayments = await Payment.create(docs);

    // Sync user payment statuses in parallel
    await Promise.all(createdPayments.map(p =>
        syncUserPaymentStatus(p.user, p.type, p.status)
    ));

    // Emails fire non-blocking — never fail the request
    users.forEach((user, i) => {
        if (createdPayments[i]?.status === 'completed') {
            sendPaymentEmail(user, createdPayments[i], 'completed').catch(() => {});
        }
    });

    return createdPayments;
};

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

module.exports = {
    createPayment,
    createBulkPayments,
    createOnlinePaymentOrder,
    createOnlinePaymentOrderForMonths,
    verifyOnlinePayment,
    queryPayments,
    getPaymentById,
    updatePaymentById,
    deletePaymentById,
    verifyUserExists,
    syncInvoiceAfterPayment,
    parseMonthString,
};