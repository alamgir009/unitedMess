const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { paymentService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const AppError = require('../../../utils/errors/AppError');
const pick = require('../../../utils/helpers/pick');

/**
 * POST /payments
 * Manual payment creation (e.g. cash)
 */
const createPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.createPayment({ ...req.body, user: req.user.id });
    sendSuccessResponse(res, 201, 'Payment record created successfully', payment);
});

/**
 * POST /payments/order
 * Create Razorpay order + pending payment record
 */
const createOnlineOrder = asyncHandler(async (req, res) => {
    const { amount, type } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
        throw new AppError('A valid positive amount is required', 400);
    }

    // Validate payment type
    const allowedTypes = ['mess_bill', 'gas_bill'];
    if (!type || !allowedTypes.includes(type)) {
        throw new AppError(`Invalid payment type. Allowed: ${allowedTypes.join(', ')}`, 400);
    }

    const { order, payment } = await paymentService.createOnlinePaymentOrder(req.user.id, amount, type);
    sendSuccessResponse(res, 201, 'Payment order created', { order, payment });
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

module.exports = {
    createPayment,
    createOnlineOrder,
    verifyPayment,
    getPayments,
    getPayment,
    updatePayment,
    deletePayment,
};