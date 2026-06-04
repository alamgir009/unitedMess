import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useRazorpaySDK } from './useRazorpaySDK';
import { RAZORPAY, PAYMENT_TYPES, isValidRazorpayKey, getRazorpayKeyMode } from '../config/payment.config';
import paymentService from '../services/payment.service';

export function usePayment({ user, onSuccess }) {
    const loadSDK        = useRazorpaySDK();
    const isPayingRef    = useRef(false);
    const isMountedRef   = useRef(true);
    const [lastPaymentId, setLastPaymentId] = useState(null);

    const safeSetPaying = useCallback((val) => {
        if (isMountedRef.current) isPayingRef.current = val;
    }, []);

    const handleCheckout = useCallback(async (
        amount,
        paymentType = PAYMENT_TYPES.MESS_BILL,
        months = null
    ) => {
        if (!amount || amount <= 0) {
            toast.error('Invalid payable amount');
            return;
        }
        if (isPayingRef.current) return;

        isPayingRef.current = true;

        try {
            await loadSDK();

            // Step 1: Create order on server — this binds the order to the backend's key
            const orderRes = await paymentService.createOnlineOrder({ amount, type: paymentType, months });
            const { order, payment, payments, keyId: serverKeyId } = orderRes?.data ?? {};
            if (!order?.id) throw new Error('Invalid order response from server');

            // Step 2: The checkout MUST use the server's key — the order was created with it.
            // Never substitute with a frontend env key; doing so would cause a 400 error
            // because Razorpay validates key_id matches the order's account.
            const rzpKey = serverKeyId;
            if (!rzpKey) {
                throw new Error(
                    'Razorpay key is not configured. ' +
                    'Please ensure RAZORPAY_KEY_ID is set on the backend.'
                );
            }

            // Step 3: Validate key format
            if (!isValidRazorpayKey(rzpKey)) {
                throw new Error(
                    'Invalid Razorpay key format. ' +
                    'Expected a key starting with "rzp_live_" or "rzp_test_".'
                );
            }

            // Step 4: In production, hard-block test keys — prevents accidental test-mode transactions
            const isProd = import.meta.env.PROD;
            const keyMode = getRazorpayKeyMode(rzpKey);
            if (isProd && keyMode === 'test') {
                throw new Error(
                    'Razorpay test key detected in production. ' +
                    'Update RAZORPAY_KEY_ID to a live key in the backend .env file and restart the server.'
                );
            }

            // Step 5: Open Razorpay checkout modal
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
                            await paymentService.verifyPayment({
                                orderId:   order.id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                            });

                            toast.success('Payment successful!');

                            if (payment?._id) setLastPaymentId(payment._id);

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
                        ondismiss: () => resolve(),
                    },
                };

                const rzp = new window.Razorpay(options);

                rzp.on('payment.failed', (resp) => {
                    const desc = resp?.error?.description;
                    const code = resp?.error?.code;
                    reject(new Error(desc || code || 'Payment failed'));
                });

                rzp.open();
            });

        } catch (err) {
            let msg = err?.response?.data?.message || err?.message || 'Payment failed';
            // Surface Razorpay-specific errors with clearer messaging
            if (msg.includes('400') || msg.includes('Bad Request') || msg.includes('preferences')) {
                msg = 'Payment gateway rejected the request. Please contact the administrator to verify the Razorpay configuration.';
            }
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
