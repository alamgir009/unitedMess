import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/app/App'
import '@/styles/global.css'

// Register merged service worker (handles VAPID web push + FCM background messages)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js', { type: 'classic', scope: '/' })
            .then((registration) => {
                if (import.meta.env.DEV) //console.log('Service Worker registered');

                // Poll for SW updates every 60s
                setInterval(() => {
                    registration.update().catch((err) => console.error('SW update failed:', err));
                }, 60000);

                // Listen for a new SW being found
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            })
            .catch((err) => {
                console.error('Service Worker registration failed:', err);
            });
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
