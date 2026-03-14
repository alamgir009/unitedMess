/**
 * useRazorpaySDK.js
 *
 * Encapsulates all Razorpay SDK loading logic.
 *
 * Design decisions:
 *  - Module-level promise cache  → the SDK loads only once per session,
 *    even across multiple component mounts.
 *  - Timeout guard               → never hangs forever if CDN is slow/down.
 *  - No listener leaks           → a single onload/onerror pair per script tag.
 *  - Zero component coupling     → pure utility, no Redux, no toast.
 */

import { RAZORPAY } from '../config/payment.config';

/** Cached promise — resolved once, reused forever. */
let _sdkPromise = null;

/**
 * Returns a Promise that resolves when `window.Razorpay` is ready.
 *
 * Call pattern:
 *   const loadSDK = useRazorpaySDK();
 *   await loadSDK();          // first call: injects <script>, waits
 *   await loadSDK();          // subsequent calls: resolves instantly
 */
function buildSDKLoader() {
    return () => {
        // Fast path: already initialised
        if (window.Razorpay) return Promise.resolve();

        // Return the in-flight or already-resolved promise (singleton)
        if (_sdkPromise) return _sdkPromise;

        _sdkPromise = new Promise((resolve, reject) => {
            const existing = document.getElementById(RAZORPAY.SDK_ID);

            const attachHandlers = (el) => {
                // Timeout guard — reject if SDK takes too long
                const timeoutId = setTimeout(() => {
                    _sdkPromise = null; // allow retry on next call
                    reject(new Error(`Razorpay SDK did not load within ${RAZORPAY.LOAD_TIMEOUT_MS}ms`));
                }, RAZORPAY.LOAD_TIMEOUT_MS);

                el.addEventListener('load', () => {
                    clearTimeout(timeoutId);
                    resolve();
                }, { once: true });

                el.addEventListener('error', () => {
                    clearTimeout(timeoutId);
                    _sdkPromise = null; // allow retry
                    reject(new Error('Razorpay SDK failed to load'));
                }, { once: true });
            };

            if (existing) {
                // Script tag already in DOM but JS not ready yet
                attachHandlers(existing);
                return;
            }

            // First call: inject the script tag (on-demand, not on page load)
            const script    = document.createElement('script');
            script.id       = RAZORPAY.SDK_ID;
            script.src      = RAZORPAY.SDK_URL;
            script.async    = true;
            attachHandlers(script);
            document.body.appendChild(script);
        });

        return _sdkPromise;
    };
}

/**
 * Hook — returns a stable `loadSDK` function reference.
 * Components call `await loadSDK()` when the user clicks "Pay Now".
 */
export function useRazorpaySDK() {
    // buildSDKLoader is pure — no need to recreate it per render
    return buildSDKLoader();
}