import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/app/App'
import '@/styles/global.css'

// Register service workers for push notifications
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // VAPID Web Push service worker
        navigator.serviceWorker.register('/service-worker.js', { type: 'classic', scope: '/' })
            .then((registration) => {
                if (import.meta.env.DEV) console.log('Service Worker registered');

                // Poll for SW updates every 60s
                setInterval(() => {
                    registration.update().catch(() => {});
                }, 60000);

                // Listen for a new SW being found
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New SW installed but waiting — tell it to activate
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            })
            .catch((err) => {
                console.error('Service Worker registration failed:', err);
            });

        // FCM service worker (for background messages when VAPID is unavailable)
        if (import.meta.env.VITE_FIREBASE_VAPID_KEY) {
            navigator.serviceWorker.register('/firebase-messaging-sw.js', { type: 'classic', scope: '/' })
                .then(() => {
                    if (import.meta.env.DEV) console.log('FCM Service Worker registered');
                })
                .catch((err) => {
                    console.error('FCM Service Worker registration failed:', err);
                });
        }
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
