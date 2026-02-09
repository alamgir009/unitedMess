const Razorpay = require('razorpay');
const config = require('../config');

const razorpay = new Razorpay({
    key_id: config.razorpay.keyId || 'rzp_test_placeholder',
    key_secret: config.razorpay.keySecret || 'placeholder_secret',
});

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in smallest currency unit (paise)
 * @param {string} currency - currency code (default INR)
 * @returns {Promise<Object>}
 */
const createOrder = async (amount, currency = 'INR') => {
    const options = {
        amount,
        currency,
        receipt: `receipt_${Date.now()}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        return order;
    } catch (error) {
        throw new Error('Razorpay order creation failed: ' + error.message);
    }
};

/**
 * Verify Razorpay payment signature
 * @param {string} orderId
 * @param {string} paymentId
 * @param {string} signature
 * @returns {boolean}
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', config.razorpay.keySecret);
    hmac.update(orderId + '|' + paymentId);
    const generatedSignature = hmac.digest('hex');
    return generatedSignature === signature;
};

module.exports = {
    createOrder,
    verifyPaymentSignature,
};
