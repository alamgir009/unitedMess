const crypto   = require('crypto');
const Razorpay = require('razorpay');
const config   = require('../config');
const AppError = require('../utils/errors/AppError');

// ─── Startup validation ─────────────────────────────────────────────────────
const { keyId, keySecret } = config.razorpay;

if (!keyId || !keySecret) {
    throw new Error('Razorpay keyId and keySecret must be set in config');
}

// Validate key_id prefix — guards against accidental misconfiguration
const RZ_LIVE_PREFIX = 'rzp_live_';
const RZ_TEST_PREFIX = 'rzp_test_';

if (!keyId.startsWith(RZ_LIVE_PREFIX) && !keyId.startsWith(RZ_TEST_PREFIX)) {
    throw new Error(
        `Invalid Razorpay key_id format: "${keyId}". ` +
        'Expected a key starting with "rzp_live_" or "rzp_test_".'
    );
}

if (config.app.env === 'production' && keyId.startsWith(RZ_TEST_PREFIX)) {
    console.warn(
        '[Razorpay] WARNING: Test key detected in production environment. ' +
        'Update RAZORPAY_KEY_ID in .env to a live key.'
    );
}

const razorpay = new Razorpay({
    key_id:     keyId,
    key_secret: keySecret,
});

// ─── Non-blocking startup validation ─────────────────────────────────────────
// Verifies the credentials are valid by making a lightweight API call.
// Does NOT block server startup — logs the result instead.
(async () => {
    try {
        await razorpay.orders.all({ count: 1 });
        console.info('[Razorpay] Credentials validated successfully —', keyId.startsWith(RZ_LIVE_PREFIX) ? 'LIVE' : 'TEST', 'mode');
    } catch (error) {
        const status = error.statusCode || error.statusCode || '';
        const msg    = error.error?.description || error.message || 'Unknown error';
        console.error(
            `[Razorpay] Credential validation FAILED (HTTP ${status}): ${msg}. ` +
            'Update RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env and restart the server.'
        );
    }
})();

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

/**
 * Validate Razorpay credentials by making a lightweight API call.
 * Used by the diagnostic endpoint — does NOT throw, returns status object.
 */
const validateCredentials = async () => {
    try {
        await razorpay.orders.all({ count: 1 });
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            message: error?.error?.description || error.message || 'Unknown error',
            statusCode: error.statusCode || error.statusCode || 0,
        };
    }
};

module.exports = { createOrder, verifyPaymentSignature, validateCredentials };