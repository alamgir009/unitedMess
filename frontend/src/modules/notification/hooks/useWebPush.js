import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import NotificationService from '../services/notification.service';

const useWebPush = () => {
    const { user } = useSelector((state) => state.auth);
    const [permissionState, setPermissionState] = useState(Notification.permission);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [error, setError] = useState(null);
    const [vapidPublicKey, setVapidPublicKey] = useState(null);
    const subscribedEndpoint = useRef(null);

    // Fetch VAPID public key on mount (if authenticated)
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

    // Check existing subscription on mount
    useEffect(() => {
        if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

        navigator.serviceWorker.ready
            .then((reg) => reg.pushManager.getSubscription())
            .then((sub) => {
                if (sub) {
                    setIsSubscribed(true);
                    subscribedEndpoint.current = sub.endpoint;
                }
            })
            .catch(() => {});
    }, [user]);

    const subscribe = useCallback(async () => {
        setError(null);

        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setError('Push notifications are not supported in this browser');
            return;
        }

        if (Notification.permission === 'denied') {
            setError('Push notification permission was denied. Please update your browser settings.');
            return;
        }

        if (!vapidPublicKey) {
            setError('Push configuration not loaded yet. Please try again.');
            return;
        }

        try {
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
            setPermissionState('granted');
        } catch (err) {
            setError(err.message || 'Failed to subscribe to push notifications');
        }
    }, [vapidPublicKey]);

    const unsubscribe = useCallback(async () => {
        setError(null);

        try {
            if ('serviceWorker' in navigator) {
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
        } catch (err) {
            setError(err.message || 'Failed to unsubscribe from push notifications');
        }
    }, []);

    return {
        permissionState,
        isSubscribed,
        subscribe,
        unsubscribe,
        error,
        supported: 'serviceWorker' in navigator && 'PushManager' in window,
    };
};

export default useWebPush;
