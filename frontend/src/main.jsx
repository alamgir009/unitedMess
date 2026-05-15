import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/app/App'
import '@/styles/global.css'

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js', { type: 'classic' })
            .then(() => {
                if (import.meta.env.DEV) console.log('Service Worker registered');
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
