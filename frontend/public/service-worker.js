/* eslint-env serviceworker */
/* global clients */

self.addEventListener('push', (event) => {
    let data = { title: 'UnitedMess', body: '', icon: '/assets/icons/unitedmess-icon-1024.png' };

    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.error('Push notification parse error:', e);
    }

    const options = {
        body: data.body || '',
        icon: data.icon || '/assets/icons/unitedmess-icon-1024.png',
        badge: data.badge || '/assets/icons/unitedmess-icon-1024.png',
        data: {
            url: data.data?.url || '/notifications',
            notificationId: data.data?.notificationId || null,
        },
        tag: data.tag || data.data?.notificationId || 'default',
        requireInteraction: data.requireInteraction === true,
        actions: [
            { action: 'mark-read', title: 'Mark Read' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    event.waitUntil(self.registration.showNotification(data.title || 'UnitedMess', options));
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
