/**
 * payment.config.js
 *
 * Single source of truth for all Razorpay + payment-related constants.
 * Never scatter these across page components.
 */

export const RAZORPAY = {
    SDK_URL:    'https://checkout.razorpay.com/v1/checkout.js',
    SDK_ID:     'razorpay-sdk',
    KEY_ID:     import.meta.env.VITE_RAZORPAY_KEY_ID ?? '',
    THEME_COLOR: '#6366f1',
    /** Maximum ms to wait for the SDK script to load before giving up */
    LOAD_TIMEOUT_MS: 8_000,
};

export const PAYMENT_TYPES = {
    MESS_BILL: 'mess_bill',
    GAS_BILL:  'gas_bill',
};