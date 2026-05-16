import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { onMessage, getMessaging } from 'firebase/messaging';
import { app, requestFcmToken } from '@/lib/firebase';
import NotificationService from '../services/notification.service';

const STORAGE_KEY = 'um_fcm_token';

const useFcmPush = () => {
    const { user } = useSelector((state) => state.auth);
    const [fcmToken, setFcmToken] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
    const [isSubscribed, setIsSubscribed] = useState(!!localStorage.getItem(STORAGE_KEY));
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [permissionState, setPermissionState] = useState(Notification.permission);
    const [supported, setSupported] = useState(false);
    const unsubscribeFromMessages = useRef(null);

    useEffect(() => {
        setSupported('serviceWorker' in navigator && 'PushManager' in window && !!import.meta.env.VITE_FIREBASE_VAPID_KEY);
    }, []);

    // Listen for foreground messages
    useEffect(() => {
        if (!user || !supported) return;

        try {
            const messaging = getMessaging(app);
            const unsub = onMessage(messaging, (payload) => {
                const data = payload.data || {};
                const notification = payload.notification || {};

                if (data.type === 'silent') return;

                window.dispatchEvent(new CustomEvent('um_fcm_notification', {
                    detail: {
                        title: notification.title || data.title || 'UnitedMess',
                        body: notification.body || data.body || '',
                        icon: data.icon || '/assets/icons/unitedmess-icon-1024.png',
                        data: {
                            url: data.url || '/notifications',
                            notificationId: data.notificationId || null,
                            type: data.type || 'SYSTEM',
                        },
                    },
                }));
            });

            unsubscribeFromMessages.current = unsub;
            return () => unsub();
        } catch {
            // Firebase not initialized yet
        }
    }, [user, supported]);

    // Restore token on mount if user is authenticated
    useEffect(() => {
        if (!user) {
            setFcmToken(null);
            setIsSubscribed(false);
            localStorage.removeItem(STORAGE_KEY);
            return;
        }

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setFcmToken(stored);
            setIsSubscribed(true);
        }
    }, [user]);

    const subscribe = useCallback(async () => {
        setError(null);
        setLoading(true);

        try {
            if (!supported) {
                throw new Error('FCM is not supported in this browser or VAPID key is missing');
            }

            if (Notification.permission === 'denied') {
                throw new Error('Notification permission was denied. Please update your browser settings.');
            }

            const token = await requestFcmToken();
            if (!token) throw new Error('Failed to obtain FCM token');

            await NotificationService.registerFcmToken({
                token,
                deviceInfo: {
                    platform: navigator.platform,
                    userAgent: navigator.userAgent,
                },
            });

            localStorage.setItem(STORAGE_KEY, token);
            setFcmToken(token);
            setIsSubscribed(true);
            setPermissionState('granted');
        } catch (err) {
            setError(err.message || 'Failed to subscribe to FCM push');
            setIsSubscribed(false);
            localStorage.removeItem(STORAGE_KEY);
        } finally {
            setLoading(false);
        }
    }, [supported]);

    const unsubscribe = useCallback(async () => {
        setError(null);
        setLoading(true);

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                await NotificationService.unregisterFcmToken({ token: stored });
            }

            localStorage.removeItem(STORAGE_KEY);
            setFcmToken(null);
            setIsSubscribed(false);
        } catch (err) {
            setError(err.message || 'Failed to unsubscribe from FCM push');
        } finally {
            setLoading(false);
        }
    }, []);

    const toggle = useCallback(async () => {
        if (isSubscribed) {
            await unsubscribe();
        } else {
            await subscribe();
        }
    }, [isSubscribed, subscribe, unsubscribe]);

    return {
        fcmToken,
        isSubscribed,
        loading,
        subscribe,
        unsubscribe,
        toggle,
        error,
        supported,
        permissionState,
    };
};

export default useFcmPush;