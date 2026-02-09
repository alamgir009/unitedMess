const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { paymentService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const pick = require('../../../utils/helpers/pick');

const createPayment = asyncHandler(async (req, res) => {
    // Manual creation (e.g. Cash)
    const payment = await paymentService.createPayment({ ...req.body, user: req.user.id });
    sendSuccessResponse(res, 201, 'Payment record created successfully', payment);
});

const createOnlineOrder = asyncHandler(async (req, res) => {
    const { amount } = req.body;
    const { order, payment } = await paymentService.createOnlinePaymentOrder(req.user.id, amount);
    sendSuccessResponse(res, 201, 'Payment order created', { order, payment });
});

const verifyPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.verifyOnlinePayment(req.body);
    sendSuccessResponse(res, 200, 'Payment verified successfully', payment);
});

const getPayments = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['status', 'paymentMethod', 'type']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    if (req.user.role !== 'admin') {
        filter.user = req.user.id;
    }
    const payments = await paymentService.queryPayments(filter, options);
    sendSuccessResponse(res, 200, 'Payments retrieved successfully', payments);
});

const getPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.getPaymentById(req.params.paymentId);
    if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
    }
    // Access control
    if (req.user.role !== 'admin' && payment.user.id !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    sendSuccessResponse(res, 200, 'Payment details', payment);
});

const updatePayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.updatePaymentById(req.params.paymentId, req.body);
    sendSuccessResponse(res, 200, 'Payment updated successfully', payment);
});

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
