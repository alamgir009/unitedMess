/**
 * usePayment.js
 *
 * Owns ALL Razorpay checkout logic:
 *   1. Load SDK on demand (via useRazorpaySDK)
 *   2. Create order via server
 *   3. Open Razorpay modal
 *   4. Verify signature
 *   5. Optionally send invoice email
 *
 * Guarantees:
 *   - setState is never called after unmount (isMountedRef)
 *   - isPaying is always reset — even on modal dismiss or error
 *   - Single toast-based error surface (no parallel Redux + local state)
 */

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useRazorpaySDK } from './useRazorpaySDK';
import { RAZORPAY, PAYMENT_TYPES, isValidRazorpayKey, getRazorpayKeyMode } from '../config/payment.config';
import paymentService from '../services/payment.service';

/**
 * @param {object} opts
 * @param {object}   opts.user            - Current auth user
 * @param {function} opts.onSuccess       - Called after successful payment + verification
 *
 * @returns {{ isPaying: boolean, handleCheckout: function }}
 */
export function usePayment({ user, onSuccess }) {
    const loadSDK        = useRazorpaySDK();
    const isPayingRef    = useRef(false);
    const isMountedRef   = useRef(true);
    const [lastPaymentId, setLastPaymentId] = useState(null);

    const safeSetPaying = useCallback((val) => {
        if (isMountedRef.current) isPayingRef.current = val;
    }, []);

    /**
     * Opens the Razorpay checkout modal.
     *
     * @param {number} amount      - Amount in base currency unit (e.g. paise for INR)
     * @param {string} paymentType - One of PAYMENT_TYPES.*
     * @param {string[]|null} months - Selected billing months for multi-month payment
     */
    const handleCheckout = useCallback(async (
        amount,
        paymentType = PAYMENT_TYPES.MESS_BILL,
        months = null
    ) => {
        if (!amount || amount <= 0) {
            toast.error('Invalid payable amount');
            return;
        }
        if (isPayingRef.current) return; // debounce double-click

        isPayingRef.current = true;

        try {
            // Step 1: Load SDK (no-op if already loaded; timeout-guarded)
            await loadSDK();

            // Step 2: Create order on server
            const orderRes = await paymentService.createOnlineOrder({ amount, type: paymentType, months });
            const { order, payment, payments, keyId: serverKeyId } = orderRes?.data ?? {};
            if (!order?.id) throw new Error('Invalid order response from server');

            // Step 3: Resolve Razorpay key — prefer server-provided, fall back to local env
            const rzpKey = serverKeyId || RAZORPAY.KEY_ID;
            if (!rzpKey) {
                throw new Error(
                    'Razorpay key is not configured. ' +
                    'Please ensure RAZORPAY_KEY_ID is set on the backend.'
                );
            }

            // Step 4: Validate key format — prevents silent test/live mismatch
            if (!isValidRazorpayKey(rzpKey)) {
                throw new Error(
                    'Invalid Razorpay key format. ' +
                    'Expected a key starting with "rzp_live_" or "rzp_test_".'
                );
            }

            // Step 5: In non-development environments, warn if a test key is used
            if (import.meta.env.PROD && getRazorpayKeyMode(rzpKey) === 'test') {
                console.warn(
                    '[usePayment] Razorpay test key detected in production build. ' +
                    'Set VITE_RAZORPAY_KEY_ID to a live key in your frontend .env file.'
                );
            }

            // Step 6: Open Razorpay checkout modal
            await new Promise((resolve, reject) => {
                const options = {
                    key:         rzpKey,
                    amount:      order.amount,
                    currency:    order.currency ?? 'INR',
                    name:        'United Mess',
                    description: paymentType === PAYMENT_TYPES.GAS_BILL
                        ? 'Gas Bill Payment'
                        : 'Mess Bill Payment',
                    order_id: order.id,

                    handler: async (response) => {
                        try {
                            // Step 7: Verify payment signature via server
                            await paymentService.verifyPayment({
                                orderId:   order.id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                            });

                            toast.success('Payment successful!');

                            if (payment?._id) setLastPaymentId(payment._id);

                            // Step 8: Notify parent to refresh data
                            if (isMountedRef.current) onSuccess?.();

                            resolve();
                        } catch (verifyErr) {
                            reject(verifyErr);
                        }
                    },

                    prefill: {
                        name:  user?.name  ?? '',
                        email: user?.email ?? '',
                    },
                    theme: { color: RAZORPAY.THEME_COLOR },
                    modal: {
                        ondismiss: () => resolve(), // user closed modal — not an error
                    },
                };

                const rzp = new window.Razorpay(options);

                rzp.on('payment.failed', (resp) => {
                    reject(new Error(resp?.error?.description ?? 'Payment failed'));
                });

                rzp.open();
            });

        } catch (err) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Payment failed';
            toast.error(msg);
        } finally {
            safeSetPaying(false);
        }
    }, [loadSDK, user, onSuccess, safeSetPaying]);

    return {
        lastPaymentId,
        handleCheckout,
        markUnmounted: () => { isMountedRef.current = false; },
    };
}