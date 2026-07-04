const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { paymentService, razorpayService } = require('../../../services');
const invoiceService = require('../../../services/invoice.service');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const AppError = require('../../../utils/errors/AppError');
const pick = require('../../../utils/helpers/pick');
const config = require('../../../config');
const UpiConfig = require('../../../models/UpiConfig.model');
const Invoice = require('../../../models/Invoice.model');
const Payment = require('../../../models/Payment.model');
const User = require('../../../models/User.model');
const notificationService = require('../../../services/notification.service');
const { getBillingPeriod } = require('../../../utils/helpers/date.helper');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Magic-byte validators for post-upload integrity check
const MAGIC_VALIDATORS = {
    'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF,
    'image/jpg':  (buf) => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF,
    'image/png':  (buf) => buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47,
    'image/webp': (buf) => buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
                      && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
};

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

    // Support explicit date range (used by the calendar view)
    if (req.query.startDate || req.query.endDate) {
        filter.paymentDate = {};
        if (req.query.startDate) filter.paymentDate.$gte = new Date(req.query.startDate);
        if (req.query.endDate)   filter.paymentDate.$lte = new Date(req.query.endDate);
    }

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

    // Post-upload magic-byte integrity check
    if (req.file.path && !/^https?:\/\//.test(req.file.path)) {
        try {
            const fd = fs.openSync(req.file.path, 'r');
            const header = Buffer.alloc(12);
            const bytesRead = fs.readSync(fd, header, 0, 12, 0);
            fs.closeSync(fd);

            const validator = MAGIC_VALIDATORS[req.file.mimetype];
            const valid = validator && bytesRead >= 3 && validator(new Uint8Array(header.buffer, header.byteOffset, bytesRead));
            if (!valid) {
                try { fs.unlinkSync(req.file.path); } catch {}
                throw new AppError('Uploaded file content does not match a supported image format.', 400);
            }
        } catch (error) {
            if (error.isOperational) throw error;
            try { fs.unlinkSync(req.file.path); } catch {}
            console.error('QR code file integrity check failed:', error);
            throw new AppError('Uploaded file content integrity check failed.', 400);
        }
    }

    // Determine if Cloudinary is configured
    const isCloudinaryConfigured = config.cloudinary &&
                                  config.cloudinary.cloud_name &&
                                  config.cloudinary.api_key &&
                                  config.cloudinary.api_secret;

    let qrCodeUrl;
    if (isCloudinaryConfigured) {
        try {
            const ext = path.extname(req.file.originalname).toLowerCase();
            const base = path.basename(req.file.originalname, ext);
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const publicId = `${base}-${uniqueSuffix}`;

            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'unitedMess/qrcodes',
                public_id: publicId,
            });
            qrCodeUrl = result.secure_url;

            // Delete temp local file
            try { fs.unlinkSync(req.file.path); } catch {}
        } catch (error) {
            try { fs.unlinkSync(req.file.path); } catch {}
            console.error('Cloudinary QR code upload failed:', error);
            throw new AppError('Failed to upload QR code image to cloud storage.', 500);
        }
    } else {
        // Disk storage: convert filesystem path to static URL
        const normalized = req.file.path.replace(/\\/g, '/');
        const uploadsIdx = normalized.indexOf('/uploads/');
        const relativePath = uploadsIdx !== -1
            ? normalized.substring(uploadsIdx)
            : '/uploads/qrcodes/' + (req.file.filename || '');
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        qrCodeUrl = `${baseUrl}${relativePath}`;
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
    const { months, transactionId, remarks, type } = req.body;
    const paymentType = type === 'gas_bill' ? 'gas_bill' : 'mess_bill';

    if (!transactionId) {
        throw new AppError('Transaction ID (UTR) is required', 400);
    }

    const cleanUtr = String(transactionId).trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
        throw new AppError('Invalid UTR format. Must be exactly 12 digits.', 400);
    }

    // Idempotency check: check if this UTR exists (pending_verification, completed, etc)
    const existingUtr = await Payment.exists({
        utr: cleanUtr,
        status: { $in: ['pending_verification', 'completed'] }
    });
    if (existingUtr) {
        throw new AppError('This Transaction reference number (UTR) has already been submitted.', 400);
    }

    const userId = req.user.id;
    const createdPayments = [];

    if (paymentType === 'gas_bill') {
        // Gas bill: single payment for current billing period
        const { monthName: billingMonthName } = getBillingPeriod();
        const user = await User.findById(userId).select('gasBillCharge gasBill').lean();
        if (!user) throw new AppError('User not found', 404);

        const amount = user.gasBillCharge || 0;
        if (amount <= 0) {
            throw new AppError('No gas bill amount due', 400);
        }

        // Check duplicate completed payment
        const completed = await Payment.exists({
            user: userId,
            type: 'gas_bill',
            month: billingMonthName,
            status: 'completed'
        });
        if (completed) {
            throw new AppError(`Gas bill already paid for ${billingMonthName}`, 400);
        }

        // Check duplicate pending verification
        const pendingVerify = await Payment.exists({
            user: userId,
            type: 'gas_bill',
            month: billingMonthName,
            status: 'pending_verification'
        });
        if (pendingVerify) {
            throw new AppError(`A gas bill payment verification is already pending for ${billingMonthName}`, 400);
        }

        const payment = await Payment.create({
            user: userId,
            amount,
            utr: cleanUtr,
            month: billingMonthName,
            type: 'gas_bill',
            status: 'pending_verification',
            paymentMethod: 'upi_manual',
            transactionId: cleanUtr,
            remarks: remarks || '',
            createdBy: userId
        });
        createdPayments.push(payment);
    } else {
        // Mess bill: payment per month
        if (!months || !Array.isArray(months) || months.length === 0) {
            throw new AppError('At least one month must be selected', 400);
        }

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
                utr: cleanUtr,
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
    }

    // Notify all admins about the new UTR submission
    const user = await User.findById(userId).select('name email').lean();
    const totalAmount = createdPayments.reduce((s, p) => s + p.amount, 0);
    const monthsList = createdPayments.map(p => p.month).join(', ');

    notificationService.sendToAdmins(
        'PAYMENT',
        'New UPI Payment Pending Verification',
        `${user?.name || 'A member'} submitted a UTR of ₹${totalAmount.toLocaleString('en-IN')} for ${monthsList}. Tap to review.`,
        {
            priority: 'HIGH',
            actionRequired: true,
            actionUrl: '/payments',
            metadata: {
                paymentIds: createdPayments.map(p => p._id.toString()),
                utr: cleanUtr,
                userName: user?.name || 'Unknown',
                amount: totalAmount,
                months: createdPayments.map(p => p.month),
                type: paymentType,
            },
        }
    );

    sendSuccessResponse(res, 201, 'Payment details submitted successfully. Pending admin verification.', createdPayments);
});

/**
 * PATCH /payments/upi-manual/:paymentId/verify  [admin only]
 * Confirm or reject a manual UPI transaction.
 * Notifies the member of the verification result.
 */
const verifyUpiManualPayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const { status, remarks } = req.body;

    if (!['completed', 'failed'].includes(status)) {
        throw new AppError('Status must be completed or failed', 400);
    }

    // Use the dedicated service function that handles audit + sync
    const updatedPayment = await paymentService.verifyUpiManualPaymentService(paymentId, {
        status,
        adminRemarks: remarks || '',
        verifiedBy: req.user.id,
    });

    // Notify the member of the verification result
    const title = status === 'completed'
        ? 'UPI Payment Approved ✓'
        : 'UPI Payment Declined ✗';
    const message = status === 'completed'
        ? `Your UPI payment of ₹${Number(updatedPayment.amount).toLocaleString('en-IN')} for ${updatedPayment.month} has been verified and approved.`
        : `Your UPI payment of ₹${Number(updatedPayment.amount).toLocaleString('en-IN')} for ${updatedPayment.month} was not approved.${remarks ? ` Reason: ${remarks}` : ' Please contact admin.'}`;

    notificationService.createAndSend(
        updatedPayment.user.toString(),
        'PAYMENT',
        title,
        message,
        {
            priority: 'HIGH',
            actionRequired: false,
            actionUrl: '/payments',
            metadata: {
                paymentId: updatedPayment._id.toString(),
                status,
                utr: updatedPayment.transactionId,
                adminRemarks: remarks || '',
            },
        }
    );

    sendSuccessResponse(res, 200, `Payment verification completed: ${status}`, updatedPayment);
});

/**
 * GET /payments/razorpay-status
 * Diagnostic endpoint — returns current Razorpay key mode (live/test)
 * and validates the credentials by making a lightweight API call.
 * Never exposes the full secret. Admin only.
 */
const getRazorpayStatus = asyncHandler(async (req, res) => {
    const keyId = config.razorpay.keyId || '';
    const isLive   = keyId.startsWith('rzp_live_');
    const isTest   = keyId.startsWith('rzp_test_');
    const mode     = isLive ? 'live' : isTest ? 'test' : 'unknown';
    const safePrefix = keyId.length > 9 ? keyId.substring(0, 9) + '...' : 'not_configured';

    // Attempt a lightweight API call to validate credentials are working
    const result = await razorpayService.validateCredentials();

    sendSuccessResponse(res, 200, 'Razorpay status retrieved', {
        mode,
        keyPrefix: safePrefix,
        env: config.app.env,
        credentials: result.valid ? 'valid' : 'invalid',
        credentialDetail: result.valid ? undefined : result.message,
        recommendation: mode === 'test' && config.app.env === 'production'
            ? 'Set RAZORPAY_KEY_ID to a live key in backend .env and restart the server.'
            : !result.valid
                ? 'The Razorpay credentials are not valid. Check KEY_ID and KEY_SECRET in .env.'
                : undefined,
    });
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
    getRazorpayStatus,
};