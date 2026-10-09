const Payment = require('../models/Payment.model');
const User = require('../models/User.model');
const Invoice = require('../models/Invoice.model');
const AppError = require('../utils/errors/AppError');
const razorpayService = require('./razorpay.service');
const emailService = require('./email.service');
const config = require('../config');
const { getBillingPeriod } = require('../utils/helpers/date.helper');
const { emitToUser } = require('../sockets');
const { determineInvoiceStatus, SETTLEMENT_TOLERANCE, buildInvoicePdfAttachment } = require('./invoice.service');

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const PAYMENT_TO_USER_STATUS = {
    completed: 'success',
    failed: 'failed',
    refunded: 'refunded',
    pending: 'pending',
    pending_verification: 'pending',
};

// Fields admin is allowed to update — prevents accidental corruption
const UPDATABLE_FIELDS = ['status', 'remarks', 'receiptUrl', 'month', 'amount', 'adminRemarks', 'changedBy'];

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
 * Syncs user.payment or user.gasBill after any payment status change.
 * Only updates the user-level status field when the payment is for the
 * current billing period — past-period payments must NOT overwrite
 * the user's current-period status.
 */
const syncUserPaymentStatus = async (userId, paymentType, paymentStatus, paymentMonth) => {
    try {
        // Only sync if the payment is for the current billing period.
        // Past-period payments should never update the single flat
        // user.payment / user.gasBill field — that field represents the
        // current period's status, not a historical record.
        if (paymentMonth) {
            const { monthName } = getBillingPeriod();
            if (paymentMonth !== monthName) {
                console.info(
                    `[Sync] Skipping user status sync: payment for ${paymentMonth} ` +
                    `differs from current billing period ${monthName}.`
                );
                return;
            }
        }

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
        // Emit billing:updated so frontend can re-fetch; admin may need to manually correct user.gasBill
        try {
            emitToUser(userId.toString(), 'billing:updated');
        } catch (_) { /* socket emit failure is non-critical */ }
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
 * Payment-confirmation email with the invoice PDF attached.
 *
 *  - Atomic claim on Payment.invoiceEmailSentAt (updateOne with
 *    `invoiceEmailSentAt: null`) → at-most-once per payment, so webhook
 *    retries / double clicks can never produce a second email.
 *  - PDF is best-effort: a build failure falls back to the plain
 *    confirmation — the member still gets the payment email.
 *  - gas_bill has no invoice PDF (the generator is mess-invoice only):
 *    attachment skipped, email still sent.
 *  - Never throws — PDF/email failure is logged with the payment ID only
 *    (no PII, no secrets) and the payment flow is unaffected.
 *
 * @param {{ _id, name, email }} user
 * @param {Object} payment - Mongoose doc or plain object
 * @param {string} status  - 'completed' | 'refunded'
 */
const sendPaymentConfirmationWithInvoice = async (user, payment, status) => {
    try {
        if (!user || !user.email) {
            console.warn('[Email] Skipping email: user data or email missing.');
            return;
        }

        // Claim BEFORE doing any work — atomic filter+update on the null
        // flag, so exactly one concurrent caller can win (modifiedCount 1)
        const claimed = await Payment.updateOne(
            { _id: payment._id, invoiceEmailSentAt: null },
            { $set: { invoiceEmailSentAt: new Date() } }
        );
        if (!claimed?.modifiedCount) {
            console.info('[Email] Payment confirmation already sent', { paymentId: String(payment._id) });
            return;
        }

        let invoicePdf = null;
        if (payment.type === 'mess_bill') {
            try {
                const parsed = parseMonthString(payment.month);
                if (parsed) {
                    invoicePdf = await buildInvoicePdfAttachment(
                        payment.user || user._id,
                        parsed.year,
                        parsed.month
                    );
                }
            } catch (err) {
                console.error('[Email] Invoice PDF build failed', {
                    paymentId: String(payment._id),
                    error: err.message,
                });
            }
        }

        await emailService.sendPaymentStatusEmail(user.email, user.name, payment, status, invoicePdf);
        console.info('[Email] Payment confirmation sent', { paymentId: String(payment._id) });
    } catch (error) {
        console.error('[Email Error] Payment confirmation failed', {
            paymentId: String(payment?._id),
            errorCode: error?.code,
            error: error.message,
        });
    }
};

/**
 * Fire-and-forget refresh of user.paybleAmountforMeal after a mess-billing
 * mutation, so the Members page's stored amount flips immediately instead of
 * waiting for the next meal/market recalc cron. Lazy-requires user.service to
 * keep module load order acyclic (invoice.service requires payment.service).
 */
const recalcUserPayable = (userId) => {
    try {
        const { recalculatePayableForUser } = require('./user.service');
        recalculatePayableForUser(userId).catch(err =>
            console.error(`[Sync] Payable recalc failed for user ${userId}:`, err.message)
        );
    } catch (err) {
        console.error(`[Sync] Payable recalc unavailable for user ${userId}:`, err.message);
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
            // Single source of truth for status (same deriver every invoice
            // read/save uses). A refunded invoice is terminal — never
            // resurrect it to paid/unpaid from a payment re-sync.
            if (invoice.status !== 'refunded') {
                invoice.status = determineInvoiceStatus(invoice.paidAmount, invoice.totalPayable);
            }
            await invoice.save();
            console.info(`[Sync] Synced invoice status for user ${userId}, month ${monthStr} to ${invoice.status}`);
        }
    } catch (err) {
        console.error('[Sync Error] Failed to sync invoice after payment:', err.message);
    }
};

/**
 * Cumulative guard for COMPLETED payments sharing {user, month, type}.
 *
 * - mess_bill: installments are legitimate (partial collected now, balance
 *   later). Allowed only while sum(existing completed) + incoming amount
 *   stays within invoice.totalPayable + settlement tolerance — the same
 *   tolerance `determineInvoiceStatus` uses to call a period settled.
 * - any other type (gas_bill, other): one completed record per period is
 *   the contract — a second completed record is always a duplicate.
 *
 * Fails closed: when the period's invoice does not exist there is nothing
 * to cap against, so the original one-record-per-period rule applies.
 *
 * @param {{ userId: string, month: string, type: string, amount?: number, excludePaymentId?: string }} opts
 *   `excludePaymentId` skips the record being edited (update path) so its own
 *   amount is not counted twice against the cap.
 * @throws {AppError} 409 when the payment would duplicate or exceed the payable
 */
const assertWithinPayableLimit = async ({ userId, month, type, amount = 0, excludePaymentId = null }) => {
    const filter = { user: userId, month, type, status: 'completed' };
    if (excludePaymentId) filter._id = { $ne: excludePaymentId };

    const completed = await Payment.find(filter);
    if (!completed || completed.length === 0) return;

    const label = (type || 'payment').replace('_', ' ');
    const duplicateError = new AppError(
        `A completed ${label} for ${month} already exists for this student.`,
        409
    );

    if (type !== 'mess_bill') throw duplicateError;

    const parsed = parseMonthString(month);
    const invoice = parsed
        ? await Invoice.findOne({ user: userId, month: parsed.month, year: parsed.year })
        : null;
    if (!invoice) throw duplicateError;

    const alreadyPaid = completed.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const proposed = alreadyPaid + (Number(amount) || 0);
    if (proposed > invoice.totalPayable + SETTLEMENT_TOLERANCE) {
        const remaining = Math.max(0, invoice.totalPayable - alreadyPaid);
        throw new AppError(
            `₹${Number(amount).toFixed(2)} exceeds the remaining payable of ₹${remaining.toFixed(2)} for ${month}.`,
            409
        );
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

    // Duplicate/cap guard: only the new record's own status is guarded —
    // refund/pending/failed records are legitimate alongside a completed one
    // (corrections, audit entries) and must never be blocked. Completed
    // mess_bill records are cumulative installments within the invoice
    // payable; other types keep the one-completed-record-per-period rule.
    if ((paymentBody.status || 'completed') === 'completed') {
        await assertWithinPayableLimit({
            userId: student._id,
            month: paymentBody.month,
            type: paymentBody.type,
            amount: paymentBody.amount,
        });
    }

    // Sub-fix B: Fix payment record creation
    // Set user field in the Payment document to student._id — never to admin ID
    const paymentData = {
        ...paymentBody,
        user: student._id,
        createdBy: createdBy || student._id, // Audit trail
        status: paymentBody.status || 'completed',
        paymentDate: (paymentBody.paymentDate && String(paymentBody.paymentDate).includes('T')) ? paymentBody.paymentDate : new Date(),
    };

    const payment = await Payment.create(paymentData);

    // Push initial status to audit trail
    payment.statusHistory.push({
        status: payment.status,
        changedBy: payment.createdBy,
        changedAt: new Date(),
        remarks: 'Payment created',
    });
    await payment.save({ validateBeforeSave: false });

    // Sub-fix C & D: Sync and Email (non-blocking)
    // Invoice + user status sync run for every decided status — a refunded or
    // failed manual payment must update user.payment/user.gasBill and the
    // invoice too (bulk path always did; single-create was completed-only).
    // Pending/pending_verification never declare the period status: they sync
    // when verified (same contract as createOnlinePaymentOrder).
    if (!['pending', 'pending_verification'].includes(payment.status)) {
        await syncUserPaymentStatus(student._id, payment.type, payment.status, payment.month);
    }
    await syncInvoiceAfterPayment(student._id, payment.month);
    if (payment.type === 'mess_bill') recalcUserPayable(student._id);

    if (['completed', 'failed', 'refunded'].includes(payment.status)) {
        sendPaymentEmail(student, payment, payment.status).catch(err => {
            console.error(`[Email Error] Failed to send payment email to ${student.email}:`, err.message);
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

    // Server-side amount validation for gas_bill:
    // Never trust client-provided amount for fixed-charge payment types.
    if (type === 'gas_bill') {
        const user = await User.findById(userId).select('gasBillCharge').lean();
        if (!user) throw new AppError('User not found', 404);
        const serverAmount = user.gasBillCharge || 0;
        if (serverAmount <= 0) {
            throw new AppError('No gas bill amount due', 400);
        }
        amount = serverAmount;
    }

    // Dynamic fee calculation: 2% platform fee + 18% GST on that fee (total 2.36%)
    const baseAmount = amount;
    const gatewayFee = Math.round(baseAmount * 0.02 * 100) / 100;
    const gstOnFee = Math.round(gatewayFee * 0.18 * 100) / 100;
    const totalPayableWithFee = baseAmount + gatewayFee + gstOnFee;

    const amountInPaise = Math.round(totalPayableWithFee * 100);

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
        gatewayFee,
        paymentDate: new Date(),
        month: billingMonthName,   // ← billing period month, not today's month
        type,
        status: 'pending',
        paymentMethod: 'razorpay',
        transactionId: order.id,
        createdBy: userId,
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
            const label = type === 'gas_bill' ? 'Gas bill' : 'Payment';
            throw new AppError(`${monthStr} ${label.toLowerCase()} is already paid.`, 409);
        }

        totalAmount += remaining;
        monthDetails.push({ monthStr, amount: remaining });
    }

    const baseAmount = totalAmount;
    const gatewayFee = Math.round(baseAmount * 0.02 * 100) / 100;
    const gstOnFee = Math.round(gatewayFee * 0.18 * 100) / 100;
    const totalPayableWithFee = baseAmount + gatewayFee + gstOnFee;

    const amountInPaise = Math.round(totalPayableWithFee * 100);

    // Create Razorpay order first — if it fails, no DB record is created
    const order = await razorpayService.createOrder(amountInPaise);

    // Create pending payment record for each month, linking them to the order.id as transactionId
    const createdPayments = [];
    for (const item of monthDetails) {
        const itemGatewayFee = Math.round(item.amount * 0.02 * 100) / 100;
        const itemGstOnFee = Math.round(itemGatewayFee * 0.18 * 100) / 100;
        const payment = await Payment.create({
            user: userId,
            amount: item.amount,
            gatewayFee: itemGatewayFee,
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

    // Atomically update each payment with findOneAndUpdate to prevent race conditions
    // Each update filters on status:'pending' so only one concurrent request can win
    const updatedPayments = [];
    for (const p of pendingPayments) {
        const updated = await Payment.findOneAndUpdate(
            { _id: p._id, status: 'pending' },
            {
                $set: {
                    status: 'completed',
                    transactionId: paymentId,
                    paymentDate: new Date(),
                },
            },
            { new: true }
        );
        if (updated) updatedPayments.push(updated);
    }

    if (updatedPayments.length === 0) {
        const completedCount = await Payment.countDocuments({ transactionId: paymentId, status: 'completed' });
        if (completedCount > 0) {
            throw new AppError('Payment already verified', 409);
        }
        throw new AppError('Payment record not found for this order', 404);
    }

    // Fetch user once — shared by sync and email
    const user = await User.findById(updatedPayments[0].user)
        .select('name email')
        .lean();

    for (const p of updatedPayments) {
        await syncUserPaymentStatus(p.user, p.type, p.status, p.month);
        await syncInvoiceAfterPayment(p.user, p.month);
        if (user) {
            sendPaymentConfirmationWithInvoice(user, p, 'completed').catch(err => {
                console.error(`[Email Error] Failed to send payment confirmation for payment ${p._id}:`, err.message);
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
            .populate(populateUser ? { path: 'user', select: 'name email image' } : null)
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
    const oldMonth = payment.month;

    // Guard: cumulative cap when a record is promoted to completed —
    // the other completed records for {user, month, type} plus this one's
    // (possibly edited) amount must stay within the payable limit.
    if (safeUpdate.status === 'completed' && oldStatus !== 'completed') {
        await assertWithinPayableLimit({
            userId: payment.user,
            month: safeUpdate.month || payment.month,
            type: payment.type,
            amount: safeUpdate.amount !== undefined ? safeUpdate.amount : payment.amount,
            excludePaymentId: payment._id,
        });
    }

    Object.assign(payment, safeUpdate);

    // Track status change in audit history
    if (safeUpdate.status && safeUpdate.status !== oldStatus) {
        payment.statusHistory.push({
            status: safeUpdate.status,
            changedBy: safeUpdate.changedBy || payment.verifiedBy || (payment.user?.toString ? payment.user : payment.user?.toString()),
            changedAt: new Date(),
            remarks: safeUpdate.adminRemarks || '',
        });
    }

    await payment.save();

    const statusChanged = safeUpdate.status && safeUpdate.status !== oldStatus;
    const monthChanged = safeUpdate.month && safeUpdate.month !== oldMonth;

    if (statusChanged || monthChanged) {
        // Fetch user once — shared by sync and email
        const user = await User.findById(payment.user)
            .select('name email')
            .lean();

        await Promise.all([
            // Month edits must re-derive user status too — this is the repair
            // path for records saved under the wrong billing month.
            syncUserPaymentStatus(payment.user, payment.type, payment.status, payment.month),
            statusChanged && user && ['completed', 'failed', 'refunded'].includes(safeUpdate.status)
                ? sendPaymentEmail(user, payment, safeUpdate.status)
                : Promise.resolve()
        ]);

        if (payment.type === 'mess_bill') recalcUserPayable(payment.user);
    }

    // Always sync invoice after payment updates
    await syncInvoiceAfterPayment(payment.user, payment.month);
    // A corrected month leaves the OLD period's invoice stale — re-sync it too
    if (monthChanged) {
        await syncInvoiceAfterPayment(payment.user, oldMonth);
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
        syncUserPaymentStatus(payment.user, payment.type, 'pending', payment.month),
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

    // Duplicate/cap guard per user — only when recording a COMPLETED payment.
    // Refund/pending/failed bulk records must not be blocked by an existing
    // completed payment (same rule as createPayment). Completed mess_bill
    // records are cumulative installments within each invoice's payable;
    // other types keep the one-completed-record-per-period rule.
    if ((paymentData.status || 'completed') === 'completed') {
        const duplicates = await Payment.find({
            user: { $in: userIds },
            month: paymentData.month,
            type: paymentData.type,
            status: 'completed',
        }).populate('user', 'name').lean();

        if (duplicates.length > 0) {
            const label = (paymentData.type || 'payment').replace('_', ' ');
            const nameOf = (d) => (typeof d.user === 'object' ? d.user?.name : 'Unknown');
            const names = [...new Set(duplicates.map(nameOf))];

            if (paymentData.type !== 'mess_bill') {
                throw new AppError(
                    `A completed ${label} for ${paymentData.month} already exists for: ${names.join(', ')}`,
                    409
                );
            }

            const parsed = parseMonthString(paymentData.month);
            const invoices = parsed
                ? await Invoice.find({ user: { $in: userIds }, month: parsed.month, year: parsed.year }).lean()
                : [];
            const invoiceByUser = new Map(invoices.map(inv => [String(inv.user), inv]));
            const paidByUser = new Map();
            duplicates.forEach(d => {
                const key = String(d.user?._id || d.user);
                paidByUser.set(key, (paidByUser.get(key) || 0) + (Number(d.amount) || 0));
            });

            // Only users that already have a completed record can exceed the
            // cap here; missing invoice → original one-record rule (fail closed)
            const overLimit = new Set();
            for (const [key, alreadyPaid] of paidByUser) {
                const inv = invoiceByUser.get(key);
                const proposed = alreadyPaid + (Number(paymentData.amount) || 0);
                if (!inv || proposed > inv.totalPayable + SETTLEMENT_TOLERANCE) overLimit.add(key);
            }

            if (overLimit.size > 0) {
                const blockedNames = [...new Set(duplicates
                    .filter(d => overLimit.has(String(d.user?._id || d.user)))
                    .map(nameOf))];
                throw new AppError(
                    `Recorded amount exceeds the remaining payable for: ${blockedNames.join(', ')}`,
                    409
                );
            }
        }
    }

    const docs = users.map(user => ({
        user: user._id,
        amount: paymentData.amount ?? 0,
        paymentDate: (paymentData.paymentDate && String(paymentData.paymentDate).includes('T')) ? paymentData.paymentDate : new Date(),
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

    // Sync user payment statuses and invoice amounts in parallel
    await Promise.all(createdPayments.map(p =>
        Promise.all([
            // Pending/pending_verification never declare the period status
            // (same contract as createPayment) — invoice sync always runs.
            ['pending', 'pending_verification'].includes(p.status)
                ? Promise.resolve()
                : syncUserPaymentStatus(p.user, p.type, p.status, p.month),
            syncInvoiceAfterPayment(p.user, p.month),
        ])
    ));
    createdPayments.forEach(p => {
        if (p.type === 'mess_bill') recalcUserPayable(p.user);
    });

    // Emails fire non-blocking — never fail the request
    users.forEach((user, i) => {
        if (['completed', 'failed', 'refunded'].includes(createdPayments[i]?.status)) {
            sendPaymentEmail(user, createdPayments[i], createdPayments[i].status).catch(() => {});
        }
    });

    return createdPayments;
};

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Manual UPI Verification (admin only)
// ─────────────────────────────────────────────────────────────

/**
 * Verify (approve/reject) a manual UPI payment.
 * Uses atomic findOneAndUpdate with a status filter to prevent race conditions.
 * Sets verifiedBy, verifiedAt, and tracks statusHistory.
 */
const verifyUpiManualPaymentService = async (paymentId, { status, adminRemarks, verifiedBy }) => {
    if (!['completed', 'failed'].includes(status)) {
        throw new AppError('Status must be completed or failed', 400);
    }

    const historyEntry = {
        status,
        changedBy: verifiedBy,
        changedAt: new Date(),
        remarks: adminRemarks || `Admin ${status === 'completed' ? 'approved' : 'rejected'} payment`,
    };

    // Build update fields — generate a unique system transaction reference
    // at approval time so the invoice shows the system reference, not the
    // raw user-submitted UTR. The original UTR is preserved in the `utr` field.
    const updateFields = {
        status,
        verifiedBy,
        verifiedAt: new Date(),
        adminRemarks: adminRemarks || '',
    };
    if (status === 'completed') {
        updateFields.transactionId = `UM${Date.now().toString(36).toUpperCase()}-${paymentId.slice(-6).toUpperCase()}`;
    }

    // Atomic update: only succeed if the payment is still in pending_verification
    const payment = await Payment.findOneAndUpdate(
        {
            _id: paymentId,
            paymentMethod: 'upi_manual',
            status: 'pending_verification',
        },
        {
            $set: updateFields,
            $push: { statusHistory: historyEntry },
        },
        { new: true }
    );

    if (!payment) {
        // Check if payment exists at all to give a precise error
        const exists = await Payment.exists({ _id: paymentId });
        if (!exists) throw new AppError('Payment record not found', 404);

        const existing = await Payment.findById(paymentId).select('paymentMethod status').lean();
        if (existing?.paymentMethod !== 'upi_manual') {
            throw new AppError('This endpoint is only for manual UPI verification', 400);
        }
        throw new AppError(`Payment is already verified or in status: ${existing?.status}`, 400);
    }

    // Sync user status and invoice (non-blocking failures logged internally)
    const user = await User.findById(payment.user).select('name email').lean();

    await Promise.all([
        syncUserPaymentStatus(payment.user, payment.type, status, payment.month),
        syncInvoiceAfterPayment(payment.user, payment.month),
    ]);

    // Send email (non-blocking) — approvals/rejections share one code path,
    // only the confirmed (completed) state carries the invoice PDF
    if (user) {
        (status === 'completed'
            ? sendPaymentConfirmationWithInvoice(user, payment, status)
            : sendPaymentEmail(user, payment, status)
        ).catch(() => {});
    }

    return payment;
};

module.exports = {
    createPayment,
    createBulkPayments,
    createOnlinePaymentOrder,
    createOnlinePaymentOrderForMonths,
    verifyOnlinePayment,
    verifyUpiManualPaymentService,
    sendPaymentConfirmationWithInvoice,
    queryPayments,
    getPaymentById,
    updatePaymentById,
    deletePaymentById,
    verifyUserExists,
    syncInvoiceAfterPayment,
    syncUserPaymentStatus,
    parseMonthString,
};