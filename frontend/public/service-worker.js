/* eslint-env serviceworker */
/* global firebase */

importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyDQyeJFDz27tAqBcHxJ24ZRIAaG3OWVfD0',
    authDomain: 'unitedmess-c2323.firebaseapp.com',
    projectId: 'unitedmess-c2323',
    storageBucket: 'unitedmess-c2323.firebasestorage.app',
    messagingSenderId: '397604518750',
    appId: '1:397604518750:web:65e19fdf6b51ecd1f3adcf',
});

const messaging = firebase.messaging();

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        clients.claim().then(() => {
            clients.matchAll({ type: 'window' }).then((windowClients) => {
                windowClients.forEach((client) => {
                    client.postMessage({ type: 'NEW_VERSION_READY' });
                });
            });
        })
    );
});

const showPushNotification = (event, data) => {
    const title = data.title || 'UnitedMess';
    const options = {
        body: data.body || '',
        icon: data.icon || '/assets/icons/resize_logo.png',
        badge: '/assets/icons/resize_logo.png',
        vibrate: [200, 100, 200],
        silent: false,
        data: {
            url: data.data?.url || '/notifications',
            notificationId: data.data?.notificationId || null,
            type: data.type || data.data?.type || 'SYSTEM',
            priority: data.priority || data.data?.priority || 'NORMAL',
        },
        tag: data.tag || data.data?.tag || data.data?.notificationId || data.data?.type || 'default',
        requireInteraction: data.requireInteraction === true || data.data?.priority === 'CRITICAL' || data.data?.priority === 'HIGH',
        actions: [
            { action: 'mark-read', title: 'Mark Read' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
};

self.addEventListener('push', (event) => {
    let data = { title: 'UnitedMess', body: '', icon: '/assets/icons/resize_logo.png' };

    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.error('Push notification parse error:', e);
    }

    showPushNotification(event, data);
});

messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const notification = payload.notification || {};

    const title = notification.title || data.title || 'UnitedMess';
    const options = {
        body: notification.body || data.body || '',
        icon: data.icon || '/assets/icons/resize_logo.png',
        badge: '/assets/icons/resize_logo.png',
        vibrate: [200, 100, 200],
        silent: false,
        data: {
            url: data.url || '/notifications',
            notificationId: data.notificationId || null,
            type: data.type || 'SYSTEM',
            priority: data.priority || 'NORMAL',
        },
        tag: data.tag || data.type || 'default',
        requireInteraction: data.priority === 'CRITICAL' || data.priority === 'HIGH',
        actions: [
            { action: 'mark-read', title: 'Mark Read' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    notification.close();

    if (event.action === 'mark-read') {
        const notificationId = notification.data?.notificationId;
        if (notificationId && notificationId !== 'default') {
            event.waitUntil(
                fetch(`/api/v1/notifications/${notificationId}/read`, { method: 'POST' }).catch(() => {})
            );
        }
        return;
    }

    if (event.action === 'dismiss') {
        return;
    }

    const urlToOpen = notification.data?.url || '/notifications';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(urlToOpen);
        })
    );
});

self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: event.newSubscription?.options?.applicationServerKey,
        }).then((newSubscription) => {
            return fetch('/api/v1/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSubscription.toJSON()),
            });
        }).catch(() => {})
    );
});
