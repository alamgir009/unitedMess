import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useRazorpaySDK } from './useRazorpaySDK';
import { RAZORPAY, PAYMENT_TYPES, isValidRazorpayKey, getRazorpayKeyMode } from '../config/payment.config';
import paymentService from '../services/payment.service';

const RZ_LIVE_PREFIX = 'rzp_live_';
const RZ_TEST_PREFIX = 'rzp_test_';

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

            const orderRes = await paymentService.createOnlineOrder({ amount, type: paymentType, months });
            const { order, payment, payments, keyId: serverKeyId } = orderRes?.data ?? {};
            if (!order?.id) throw new Error('Invalid order response from server');

            const serverKey = serverKeyId || '';
            const envKey    = RAZORPAY.KEY_ID || '';
            const isProd    = import.meta.env.PROD;
            const serverMode = getRazorpayKeyMode(serverKey);
            const envMode    = getRazorpayKeyMode(envKey);

            let rzpKey = serverKey || envKey;

            if (!rzpKey) {
                throw new Error(
                    'Razorpay key is not configured. ' +
                    'Please ensure RAZORPAY_KEY_ID is set on the backend.'
                );
            }

            if (!isValidRazorpayKey(rzpKey)) {
                throw new Error(
                    'Invalid Razorpay key format. ' +
                    'Expected a key starting with "rzp_live_" or "rzp_test_".'
                );
            }

            // Production hardening: block test keys, prefer live from env if available
            if (isProd) {
                const envHasLive  = envMode === 'live';
                const envHasTest  = envMode === 'test';
                const srvHasTest  = serverMode === 'test';
                const srvHasLive  = serverMode === 'live';

                if (srvHasTest && envHasLive) {
                    rzpKey = envKey;
                    toast.error(
                        '⚠️ Razorpay is using test keys on the server. ' +
                        'Please contact the admin to restart the backend with live credentials. ' +
                        'Payment will proceed with the frontend live key as a fallback.',
                        { duration: 6000 }
                    );
                } else if (srvHasTest && !envHasLive) {
                    throw new Error(
                        'Razorpay test key detected in production. ' +
                        'Update RAZORPAY_KEY_ID to a live key in the backend .env file and restart the server.'
                    );
                } else if (envHasTest && !srvHasLive) {
                    throw new Error(
                        'Razorpay test key configured in frontend environment. ' +
                        'Set VITE_RAZORPAY_KEY_ID to a live key and rebuild the frontend.'
                    );
                } else if (srvHasLive || envHasLive) {
                    rzpKey = srvHasLive ? serverKey : envKey;
                }
            }

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
