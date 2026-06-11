/**
 * useRazorpaySDK.js
 *
 * Encapsulates all Razorpay SDK loading logic with a highly robust polling and recovery mechanism.
 *
 * Design decisions:
 *  - Module-level promise cache  → the SDK loads only once per session.
 *  - Polling fallback            → if the script tag already exists but window.Razorpay is not yet initialized,
 *                                  we poll window.Razorpay instead of hanging on events that already fired.
 *  - Automatic recovery          → removes failed script tags and resets the promise to allow clean retries.
 *  - Zero component coupling     → pure utility.
 */

import { RAZORPAY } from '../config/payment.config';

/** Cached promise — resolved once, reused forever. */
let _sdkPromise = null;

export function useRazorpaySDK() {
    return () => {
        // 1. Fast path: Razorpay already globally loaded
        if (window.Razorpay) {
            return Promise.resolve();
        }

        // 2. Return in-flight promise if one is active
        if (_sdkPromise) {
            return _sdkPromise;
        }

        // 3. Create loader promise
        _sdkPromise = new Promise((resolve, reject) => {
            const existing = document.getElementById(RAZORPAY.SDK_ID);
            
            const cleanup = () => {
                _sdkPromise = null;
            };

            // Start polling if script tag already exists in the DOM but window.Razorpay isn't set yet
            const startPolling = (timeoutMs) => {
                const intervalTime = 50;
                let elapsed = 0;
                
                const timer = setInterval(() => {
                    if (window.Razorpay) {
                        clearInterval(timer);
                        resolve();
                    } else {
                        elapsed += intervalTime;
                        if (elapsed >= timeoutMs) {
                            clearInterval(timer);
                            cleanup();
                            if (existing) {
                                try { existing.remove(); } catch(e) { console.error(e); }
                            }
                            reject(new Error('Razorpay SDK failed to initialize (polling timeout)'));
                        }
                    }
                }, intervalTime);
            };

            if (existing) {
                startPolling(RAZORPAY.LOAD_TIMEOUT_MS);
                return;
            }

            // Injected on-demand
            const script = document.createElement('script');
            script.id = RAZORPAY.SDK_ID;
            script.src = RAZORPAY.SDK_URL;
            script.async = true;

            const timeoutId = setTimeout(() => {
                cleanup();
                try { script.remove(); } catch(e) { console.error(e); }
                reject(new Error(`Razorpay SDK did not load within ${RAZORPAY.LOAD_TIMEOUT_MS}ms`));
            }, RAZORPAY.LOAD_TIMEOUT_MS);

            script.onload = () => {
                clearTimeout(timeoutId);
                if (window.Razorpay) {
                    resolve();
                } else {
                    cleanup();
                    try { script.remove(); } catch(e) { console.error(e); }
                    reject(new Error('Razorpay SDK loaded but window.Razorpay is undefined'));
                }
            };

            script.onerror = () => {
                clearTimeout(timeoutId);
                cleanup();
                try { script.remove(); } catch(e) { console.error(e); }
                reject(new Error('Razorpay SDK failed to load'));
            };

            document.body.appendChild(script);
        });

        return _sdkPromise;
    };
}