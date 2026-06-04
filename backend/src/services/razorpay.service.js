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
    throw new Error(
        '[Razorpay] FATAL: Test key detected in production environment. ' +
        'Set RAZORPAY_KEY_ID to a live key (rzp_live_...) ' +
        'in your deployment platform environment variables (or in backend/.env) ' +
        'and restart the server.'
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
    // Diagnose key source: platform env vars take precedence over .env
    const rawEnv = process.env.RAZORPAY_KEY_ID || '(not set)';
    const rawPrefix = rawEnv.length > 9 ? rawEnv.substring(0, 9) + '...' : rawEnv;

    try {
        await razorpay.orders.all({ count: 1 });
        console.info(
            `[Razorpay] Credentials valid — ${keyId.startsWith(RZ_LIVE_PREFIX) ? 'LIVE' : 'TEST'} mode. ` +
            `Key loaded from: ${rawEnv === keyId ? 'PLATFORM env var' : '.env file'} (prefix: ${rawPrefix})`
        );
    } catch (error) {
        const status = error.statusCode || error.statusCode || '';
        const msg    = error?.error?.description || error.message || 'Unknown error';
        console.error(
            `[Razorpay] Credential validation FAILED (HTTP ${status}): ${msg}. ` +
            `Key source: ${rawEnv === keyId ? 'PLATFORM env var' : '.env file'} (prefix: ${rawPrefix}). ` +
            'Verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
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