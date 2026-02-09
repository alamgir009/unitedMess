const Payment = require('../models/Payment.model');
const razorpayService = require('./razorpay.service');

/**
 * Create a payment record (e.g. cash payment or initial online record)
 * @param {Object} paymentBody
 * @returns {Promise<Payment>}
 */
const createPayment = async (paymentBody) => {
    return Payment.create(paymentBody);
};

/**
 * Create an online payment order (Razorpay)
 * @param {Object} paymentInfo
 * @returns {Promise<Object>}
 */
const createOnlinePaymentOrder = async (userId, amount) => {
    // Amount in paise
    const amountInPaise = Math.round(amount * 100);
    const order = await razorpayService.createOrder(amountInPaise);

    // Create a pending payment record
    const payment = await createPayment({
        user: userId,
        amount,
        paymentDate: new Date(),
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        type: 'mess_bill', // Default or pass from args
        status: 'pending',
        paymentMethod: 'razorpay',
        transactionId: order.id, // Store order ID as transaction ID temporarily
    });

    return { order, payment };
};

/**
 * Verify and update payment status
 * @param {Object} verificationBody
 * @returns {Promise<Payment>}
 */
const verifyOnlinePayment = async (verificationBody) => {
    const { orderId, paymentId, signature } = verificationBody;
    const isValid = razorpayService.verifyPaymentSignature(orderId, paymentId, signature);

    if (!isValid) {
        throw new Error('Invalid payment signature');
    }

    // Update payment record
    const payment = await Payment.findOne({ transactionId: orderId });
    if (!payment) {
        throw new Error('Payment record not found for order');
    }

    payment.status = 'completed';
    payment.paymentMethod = 'razorpay';
    // Optionally update transactionId to the actual paymentId if needed, or keep orderId
    // payment.transactionId = paymentId; 
    await payment.save();

    return payment;
};

/**
 * Query for payments
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const queryPayments = async (filter, options) => {
    const payments = await Payment.find(filter).sort({ paymentDate: -1 }).populate('user', 'name email');
    return payments;
};

/**
 * Get payment by id
 * @param {ObjectId} id
 * @returns {Promise<Payment>}
 */
const getPaymentById = async (id) => {
    return Payment.findById(id).populate('user', 'name email');
};

/**
 * Update payment by id
 * @param {ObjectId} paymentId
 * @param {Object} updateBody
 * @returns {Promise<Payment>}
 */
const updatePaymentById = async (paymentId, updateBody) => {
    const payment = await getPaymentById(paymentId);
    if (!payment) {
        throw new Error('Payment not found');
    }
    Object.assign(payment, updateBody);
    await payment.save();
    return payment;
};

/**
 * Delete payment by id
 * @param {ObjectId} paymentId
 * @returns {Promise<Payment>}
 */
const deletePaymentById = async (paymentId) => {
    const payment = await getPaymentById(paymentId);
    if (!payment) {
        throw new Error('Payment not found');
    }
    await payment.remove();
    return payment;
};

module.exports = {
    createPayment,
    createOnlinePaymentOrder,
    verifyOnlinePayment,
    queryPayments,
    getPaymentById,
    updatePaymentById,
    deletePaymentById,
};
