const RZ_LIVE_PREFIX = 'rzp_live_';
const RZ_TEST_PREFIX  = 'rzp_test_';

/**
 * Validate a Razorpay key_id format.
 * Returns `true` if the key is a valid live or test key.
 */
export function isValidRazorpayKey(key) {
    if (!key || typeof key !== 'string') return false;
    return key.startsWith(RZ_LIVE_PREFIX) || key.startsWith(RZ_TEST_PREFIX);
}

/**
 * Returns `'live'`, `'test'`, or `null` depending on the key prefix.
 */
export function getRazorpayKeyMode(key) {
    if (!key || typeof key !== 'string') return null;
    if (key.startsWith(RZ_LIVE_PREFIX)) return 'live';
    if (key.startsWith(RZ_TEST_PREFIX)) return 'test';
    return null;
}

export const RAZORPAY = {
    SDK_URL:       'https://checkout.razorpay.com/v1/checkout.js',
    SDK_ID:        'razorpay-sdk',
    KEY_ID:        import.meta.env.VITE_RAZORPAY_KEY_ID ?? '',
    THEME_COLOR:   '#6366f1',
    LOAD_TIMEOUT_MS: 8_000,
};

export const PAYMENT_TYPES = {
    MESS_BILL: 'mess_bill',
    GAS_BILL:  'gas_bill',
};