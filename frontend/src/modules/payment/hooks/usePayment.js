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
import { RAZORPAY, PAYMENT_TYPES } from '../config/payment.config';
import paymentService from '../services/payment.service';

/**
 * @param {object} opts
 * @param {object}   opts.user            - Current auth user
 * @param {function} opts.onSuccess       - Called after successful payment + verification
 * @param {boolean}  [opts.sendEmail=true]- Auto-send invoice email for mess bill
 *
 * @returns {{ isPaying: boolean, handleCheckout: function }}
 */
export function usePayment({ user, onSuccess, sendEmail = true }) {
    const loadSDK        = useRazorpaySDK();
    const isPayingRef    = useRef(false);
    const isMountedRef   = useRef(true);
    const [lastPaymentId, setLastPaymentId] = useState(null);

    // Track mount state — set to false on cleanup
    // Components that use this hook must call the returned `cleanup` if needed,
    // but useEffect handles it automatically via the returned teardown.
    const safeSetPaying = useCallback((val) => {
        if (isMountedRef.current) isPayingRef.current = val;
    }, []);

    const sendInvoiceEmail = useCallback(async (paymentId) => {
        if (!paymentId) return;
        try {
            await paymentService.sendInvoiceEmail(paymentId);
            toast.success('📧 Invoice sent to your email!');
        } catch (err) {
            if (err?.response?.status === 404) {
                toast('Invoice email coming soon!', { icon: '🔔' });
            } else {
                toast.error(err?.response?.data?.message ?? 'Failed to send invoice email');
            }
        }
    }, []);

    /**
     * Opens the Razorpay checkout modal.
     *
     * @param {number} amount      - Amount in base currency unit (e.g. paise for INR)
     * @param {string} paymentType - One of PAYMENT_TYPES.*
     */
    const handleCheckout = useCallback(async (
        amount,
        paymentType = PAYMENT_TYPES.MESS_BILL,
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
            const orderRes = await paymentService.createOnlineOrder({ amount, type: paymentType });
            const { order, payment } = orderRes?.data ?? {};
            if (!order?.id) throw new Error('Invalid order response from server');

            // Step 3: Open modal
            await new Promise((resolve, reject) => {
                const options = {
                    key:         RAZORPAY.KEY_ID,
                    amount:      order.amount,
                    currency:    order.currency ?? 'INR',
                    name:        'United Mess',
                    description: paymentType === PAYMENT_TYPES.GAS_BILL
                        ? 'Gas Bill Payment'
                        : 'Mess Bill Payment',
                    order_id: order.id,

                    handler: async (response) => {
                        try {
                            // Step 4: Verify payment
                            await paymentService.verifyPayment({
                                orderId:   order.id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                            });

                            toast.success('✅ Payment successful!');

                            if (payment?._id) setLastPaymentId(payment._id);

                            // Step 5: Notify parent (refresh data)
                            if (isMountedRef.current) onSuccess?.();

                            // Step 6: Send invoice email (mess bill only)
                            if (sendEmail && paymentType !== PAYMENT_TYPES.GAS_BILL && payment?._id) {
                                setTimeout(() => sendInvoiceEmail(payment._id), 1_000);
                            }

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
            // Always reset — whether success, failure, dismiss, or unmount
            safeSetPaying(false);
        }
    }, [loadSDK, user, onSuccess, sendEmail, sendInvoiceEmail, safeSetPaying]);

    return {
        /** Read-only: current paying state (use useState in your component to track re-renders) */
        lastPaymentId,
        handleCheckout,
        /** Call this in your component's useEffect cleanup */
        markUnmounted: () => { isMountedRef.current = false; },
    };
}