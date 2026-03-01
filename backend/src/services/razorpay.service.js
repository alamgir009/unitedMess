const crypto   = require('crypto');           // hoisted — never require inside functions
const Razorpay = require('razorpay');
const config   = require('../config');
const AppError = require('../utils/errors/AppError');

if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new Error('Razorpay keyId and keySecret must be set in config');
}

const razorpay = new Razorpay({
    key_id:     config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
});

/**
 * Create a Razorpay order
 * @param {number} amount   - Amount in paise
 * @param {string} currency - Default INR
 */
const createOrder = async (amount, currency = 'INR') => {
    try {
        return await razorpay.orders.create({
            amount,
            currency,
            receipt: `rcpt_${Date.now()}`,
        });
    } catch (error) {
        throw new AppError(`Razorpay order creation failed: ${error.message}`, 502);
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
    const hmac = crypto.createHmac('sha256', config.razorpay.keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const generated = hmac.digest('hex');

    // Timing-safe comparison — prevents timing attack
    return crypto.timingSafeEqual(
        Buffer.from(generated, 'hex'),
        Buffer.from(signature,  'hex')
    );
};

module.exports = { createOrder, verifyPaymentSignature };