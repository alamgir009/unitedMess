const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { paymentService } = require('../../../services');
const invoiceService = require('../../../services/invoice.service');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const AppError = require('../../../utils/errors/AppError');
const pick = require('../../../utils/helpers/pick');
const config = require('../../../config');
const UpiConfig = require('../../../models/UpiConfig.model');
const Invoice = require('../../../models/Invoice.model');
const Payment = require('../../../models/Payment.model');
const { getBillingPeriod } = require('../../../utils/helpers/date.helper');

/**
 * POST /payments
 * Manual payment creation (e.g. cash)
 */
const createPayment = asyncHandler(async (req, res) => {
    const { user: targetUserIdBody, userId: targetUserIdAlt } = req.body;
    const targetUserId = targetUserIdBody || targetUserIdAlt;

    if (!targetUserId) {
        throw new AppError('Target student ID is required', 400);
    }

    // Authorization guard: non-admins can only create payments for themselves
    if (req.user.role !== 'admin' && targetUserId.toString() !== req.user.id.toString()) {
        throw new AppError('You do not have permission to create payments for other users', 403);
    }

    const payment = await paymentService.createPayment({
        ...req.body,
        user: targetUserId,
        createdBy: req.user.id
    });

    sendSuccessResponse(res, 201, 'Payment record created successfully', payment);
});

/**
 * POST /payments/order
 * Create Razorpay order + pending payment record
 */
const createOnlineOrder = asyncHandler(async (req, res) => {
    const { amount, type, months } = req.body;

    // Validate payment type
    const allowedTypes = ['mess_bill', 'gas_bill'];
    if (!type || !allowedTypes.includes(type)) {
        throw new AppError(`Invalid payment type. Allowed: ${allowedTypes.join(', ')}`, 400);
    }

    if (months && Array.isArray(months) && months.length > 0) {
        // Multi-month flow
        const { order, payments, keyId } = await paymentService.createOnlinePaymentOrderForMonths(req.user.id, months, type);
        
        sendSuccessResponse(res, 201, 'Payment order created', {
            order,
            payments,
            keyId: keyId || config.razorpay.keyId,
        });
    } else {
        // Fallback to original single-month flow
        if (!amount || isNaN(amount) || amount <= 0) {
            throw new AppError('A valid positive amount is required', 400);
        }

        const { order, payment } = await paymentService.createOnlinePaymentOrder(req.user.id, amount, type);

        sendSuccessResponse(res, 201, 'Payment order created', {
            order,
            payment,
            keyId: config.razorpay.keyId,
        });
    }
});

/**
 * POST /payments/verify
 * Verify Razorpay payment signature & mark completed
 */
const verifyPayment = asyncHandler(async (req, res) => {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
        throw new AppError('orderId, paymentId and signature are required', 400);
    }

    const payment = await paymentService.verifyOnlinePayment({ orderId, paymentId, signature });
    sendSuccessResponse(res, 200, 'Payment verified successfully', payment);
});

/**
 * GET /payments
 * Admin sees all, user sees own
 */
const getPayments = asyncHandler(async (req, res) => {
    const filter  = pick(req.query, ['status', 'paymentMethod', 'type']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin) filter.user = req.user.id;

    const payments = await paymentService.queryPayments(filter, options, isAdmin);
    sendSuccessResponse(res, 200, 'Payments retrieved successfully', payments);
});

/**
 * GET /payments/:paymentId
 * Admin sees any, user sees own only
 */
const getPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.getPaymentById(req.params.paymentId);
    if (!payment) throw new AppError('Payment not found', 404);

    // payment.user is populated — use ._id for comparison
    if (req.user.role !== 'admin' && payment.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to access this payment', 403);
    }

    sendSuccessResponse(res, 200, 'Payment retrieved successfully', payment);
});

/**
 * PATCH /payments/:paymentId  [admin only]
 */
const updatePayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.updatePaymentById(req.params.paymentId, req.body);
    sendSuccessResponse(res, 200, 'Payment updated successfully', payment);
});

/**
 * DELETE /payments/:paymentId  [admin only]
 */
const deletePayment = asyncHandler(async (req, res) => {
    await paymentService.deletePaymentById(req.params.paymentId);
    res.status(204).send();
});

/**
 * POST /payments/bulk  [admin only]
 * Atomic creation of identical payments for multiple users
 */
const createBulkPayments = asyncHandler(async (req, res) => {
    const { userIds, ...rest } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('userIds array is required with at least one user', 400);
    }

    if (userIds.length > 100) {
        throw new AppError('Maximum 100 users per bulk payment operation', 400);
    }

    const payments = await paymentService.createBulkPayments({
        ...rest,
        userIds,
        createdBy: req.user.id,
    });

    sendSuccessResponse(res, 201, `${payments.length} payment records created successfully`, payments);
});

/**
 * GET /payments/payable-months
 * Get all payable months and their invoice/payment verification status
 */
const getPayableMonths = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { month: activeMonth, year: activeYear } = getBillingPeriod();

    // Ensure active invoice is initialized
    await invoiceService.getInvoice(userId, activeMonth, activeYear);

    // Fetch user invoices
    const invoices = await Invoice.find({ user: userId }).sort({ year: -1, month: -1 }).lean();

    // Fetch all payment records for user
    const payments = await Payment.find({ user: userId }).lean();

    const payableMonths = invoices.map(inv => {
        const monthPayments = payments.filter(p => p.month === inv.monthName);

        let status = 'UNPAID';
        if (inv.status === 'paid') {
            status = 'PAID';
        } else if (monthPayments.some(p => p.status === 'pending_verification')) {
            status = 'PENDING_VERIFICATION';
        } else if (monthPayments.some(p => p.status === 'pending')) {
            status = 'PENDING';
        } else if (inv.status === 'partially_paid') {
            status = 'PARTIALLY_PAID';
        }

        return {
            monthName: inv.monthName,
            month: inv.month,
            year: inv.year,
            totalPayable: inv.totalPayable,
            paidAmount: inv.paidAmount,
            remainingAmount: Math.max(0, inv.totalPayable - inv.paidAmount),
            status
        };
    });

    sendSuccessResponse(res, 200, 'Payable months retrieved successfully', payableMonths);
});

/**
 * GET /payments/upi-config
 * Fetch current UPI config
 */
const getUpiConfig = asyncHandler(async (req, res) => {
    let upiConfig = await UpiConfig.findOne().sort({ createdAt: -1 }).lean();
    if (!upiConfig) {
        // Fallback defaults
        upiConfig = {
            upiId: process.env.ADMIN_UPI_ID || '',
            merchantName: 'United Mess Admin',
            qrCodeUrl: ''
        };
    }
    sendSuccessResponse(res, 200, 'UPI config retrieved successfully', upiConfig);
});

/**
 * PUT /payments/upi-config  [admin only]
 * Update UPI details (upiId, merchantName)
 */
const updateUpiConfig = asyncHandler(async (req, res) => {
    const { upiId, merchantName } = req.body;
    if (!upiId) {
        throw new AppError('UPI ID is required', 400);
    }

    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
        throw new AppError('Invalid UPI ID format. Expected format: user@bank', 400);
    }

    let upiConfig = await UpiConfig.findOne();
    if (upiConfig) {
        upiConfig.upiId = upiId;
        if (merchantName) upiConfig.merchantName = merchantName;
        upiConfig.updatedBy = req.user.id;
        await upiConfig.save();
    } else {
        upiConfig = await UpiConfig.create({
            upiId,
            merchantName: merchantName || 'United Mess Admin',
            updatedBy: req.user.id
        });
    }

    sendSuccessResponse(res, 200, 'UPI config updated successfully', upiConfig);
});

/**
 * POST /payments/upi-config/qrcode  [admin only]
 * Upload QR code image
 */
const uploadQrCode = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload an image file for QR code', 400);
    }

    let qrCodeUrl = req.file.path;
    // Disk storage fallback check
    if (!req.file.path.startsWith('http')) {
        const relativePath = req.file.path.replace(/\\/g, '/').split('/uploads/')[1];
        qrCodeUrl = `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
    }

    let upiConfig = await UpiConfig.findOne();
    if (upiConfig) {
        upiConfig.qrCodeUrl = qrCodeUrl;
        upiConfig.updatedBy = req.user.id;
        await upiConfig.save();
    } else {
        throw new AppError('Please configure UPI ID first before uploading QR code', 400);
    }

    sendSuccessResponse(res, 200, 'QR code uploaded successfully', upiConfig);
});

/**
 * POST /payments/upi-manual
 * Submit manual UPI payment UTR references for verification
 */
const submitUpiManualPayment = asyncHandler(async (req, res) => {
    const { months, transactionId, remarks } = req.body;

    if (!months || !Array.isArray(months) || months.length === 0) {
        throw new AppError('At least one month must be selected', 400);
    }
    if (!transactionId) {
        throw new AppError('Transaction ID (UTR) is required', 400);
    }

    const cleanUtr = String(transactionId).trim();
    if (!/^[a-zA-Z0-9]{8,20}$/.test(cleanUtr)) {
        throw new AppError('Invalid UTR format. Must be 8-20 alphanumeric characters.', 400);
    }

    // Idempotency check: check if this UTR exists (pending, completed, etc)
    const existingUtr = await Payment.exists({ transactionId: cleanUtr });
    if (existingUtr) {
        throw new AppError('This Transaction reference number (UTR) has already been submitted.', 400);
    }

    const userId = req.user.id;
    const createdPayments = [];

    for (const monthStr of months) {
        const parsed = paymentService.parseMonthString(monthStr);
        if (!parsed) {
            throw new AppError(`Invalid month format: ${monthStr}`, 400);
        }

        const invoice = await invoiceService.getInvoice(userId, parsed.month, parsed.year);
        const remaining = Math.max(0, invoice.totalPayable - invoice.paidAmount);
        if (remaining <= 0) {
            throw new AppError(`Invoice for ${monthStr} is already fully paid`, 400);
        }

        // Check duplicate pending verification
        const pendingVerify = await Payment.exists({
            user: userId,
            month: monthStr,
            status: 'pending_verification'
        });
        if (pendingVerify) {
            throw new AppError(`A payment verification is already pending for ${monthStr}`, 400);
        }

        const payment = await Payment.create({
            user: userId,
            amount: remaining,
            month: monthStr,
            type: 'mess_bill',
            status: 'pending_verification',
            paymentMethod: 'upi_manual',
            transactionId: cleanUtr,
            remarks: remarks || '',
            createdBy: userId
        });

        createdPayments.push(payment);
    }

    sendSuccessResponse(res, 201, 'Payment details submitted successfully. Pending admin verification.', createdPayments);
});

/**
 * PATCH /payments/upi-manual/:paymentId/verify  [admin only]
 * Confirm or reject a manual UPI transaction
 */
const verifyUpiManualPayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const { status, remarks } = req.body;

    if (!['completed', 'failed'].includes(status)) {
        throw new AppError('Status must be completed or failed', 400);
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
        throw new AppError('Payment record not found', 404);
    }

    if (payment.paymentMethod !== 'upi_manual') {
        throw new AppError('This endpoint is only for manual UPI verification', 400);
    }

    if (payment.status !== 'pending_verification') {
        throw new AppError(`Payment is already verified or in status: ${payment.status}`, 400);
    }

    const updatedPayment = await paymentService.updatePaymentById(paymentId, { status, remarks });

    sendSuccessResponse(res, 200, `Payment verification completed: ${status}`, updatedPayment);
});

module.exports = {
    createPayment,
    createBulkPayments,
    createOnlineOrder,
    verifyPayment,
    getPayments,
    getPayment,
    updatePayment,
    deletePayment,
    getPayableMonths,
    getUpiConfig,
    updateUpiConfig,
    uploadQrCode,
    submitUpiManualPayment,
    verifyUpiManualPayment,
};