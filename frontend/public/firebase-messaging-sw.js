/* eslint-env serviceworker */
/* global importScripts firebase */

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

messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const notification = payload.notification || {};

    const title = notification.title || data.title || 'UnitedMess';
    const options = {
        body: notification.body || data.body || '',
        icon: data.icon || '/assets/icons/unitedmess-icon-1024.png',
        badge: data.badge || '/assets/icons/unitedmess-icon-1024.png',
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