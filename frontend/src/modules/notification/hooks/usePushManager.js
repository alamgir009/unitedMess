import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import NotificationService from '../services/notification.service';

const STORAGE_KEY = 'um_vapid_subscribed';

const usePushManager = () => {
    const { user } = useSelector((state) => state.auth);
    const [permissionState, setPermissionState] = useState(Notification.permission);
    const [isSubscribed, setIsSubscribed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [vapidPublicKey, setVapidPublicKey] = useState(null);
    const [supported, setSupported] = useState(false);
    const subscribedEndpoint = useRef(null);

    useEffect(() => {
        setSupported('serviceWorker' in navigator && 'PushManager' in window);
    }, []);

    useEffect(() => {
        if (!user) return;
        NotificationService.getPushConfig()
            .then((res) => {
                if (res?.data?.vapidPublicKey) {
                    setVapidPublicKey(res.data.vapidPublicKey);
                }
            })
            .catch(() => {});
    }, [user]);

    useEffect(() => {
        if (!user || !supported) return;

        navigator.serviceWorker.ready
            .then((reg) => reg.pushManager.getSubscription())
            .then((sub) => {
                if (sub) {
                    setIsSubscribed(true);
                    localStorage.setItem(STORAGE_KEY, 'true');
                    subscribedEndpoint.current = sub.endpoint;
                } else {
                    setIsSubscribed(false);
                    localStorage.removeItem(STORAGE_KEY);
                }
            })
            .catch(() => {});
    }, [user, supported]);

    const subscribe = useCallback(async () => {
        setError(null);
        setLoading(true);

        try {
            if (!supported) {
                throw new Error('Push notifications are not supported in this browser');
            }

            if (Notification.permission === 'denied') {
                throw new Error('Push notification permission was denied. Please update your browser settings.');
            }

            if (!vapidPublicKey) {
                throw new Error('Push configuration not loaded yet. Please try again.');
            }

            if (Notification.permission !== 'granted') {
                const perm = await Notification.requestPermission();
                setPermissionState(perm);
                if (perm !== 'granted') {
                    throw new Error('Notification permission was denied');
                }
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidPublicKey,
            });

            const subJSON = subscription.toJSON();
            await NotificationService.subscribeToPush({
                endpoint: subJSON.endpoint,
                keys: subJSON.keys,
                userAgent: navigator.userAgent,
            });

            subscribedEndpoint.current = subJSON.endpoint;
            setIsSubscribed(true);
            localStorage.setItem(STORAGE_KEY, 'true');
            setPermissionState('granted');
        } catch (err) {
            setError(err.message || 'Failed to subscribe to push notifications');
            setIsSubscribed(false);
            localStorage.removeItem(STORAGE_KEY);
        } finally {
            setLoading(false);
        }
    }, [vapidPublicKey, supported]);

    const unsubscribe = useCallback(async () => {
        setError(null);
        setLoading(true);

        try {
            if (supported) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();
                }
            }

            await NotificationService.unsubscribeFromPush(
                subscribedEndpoint.current ? { endpoint: subscribedEndpoint.current } : {}
            );

            subscribedEndpoint.current = null;
            setIsSubscribed(false);
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            setError(err.message || 'Failed to unsubscribe from push notifications');
        } finally {
            setLoading(false);
        }
    }, [supported]);

    const toggle = useCallback(async () => {
        if (isSubscribed) {
            await unsubscribe();
        } else {
            await subscribe();
        }
    }, [isSubscribed, subscribe, unsubscribe]);

    return {
        permissionState,
        isSubscribed,
        loading,
        subscribe,
        unsubscribe,
        toggle,
        error,
        supported,
    };
};

export default usePushManager;