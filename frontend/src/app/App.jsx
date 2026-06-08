import { Suspense, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppProviders from './providers/AppProviders';
import AppRoutes from '@/routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import { restoreSession } from '@/modules/auth/store/auth.slice';
import { injectStore } from '@/services/api/client/apiClient';
import { store } from '@/store';
import { FullPageLoader } from '@/shared/components/ui';
import { initVersionChecker } from '@/services/version/versionChecker';
import useSocket from '@/modules/notification/hooks/useSocket';

injectStore(store);

const SessionGate = ({ children }) => {
    const dispatch = useDispatch();
    const sessionRestoring = useSelector((state) => state.auth.sessionRestoring);

    useEffect(() => {
        dispatch(restoreSession());
    }, []);

    if (sessionRestoring) {
        return <FullPageLoader label="Restoring session…" />;
    }

    return children;
};

const VersionInit = () => {
    useEffect(() => {
        const cleanup = initVersionChecker();
        return () => cleanup();
    }, []);
    return null;
};

const SocketInit = () => {
    useSocket();
    return null;
};

const SessionKeepAlive = () => {
    const lastActivityRef = useRef(Date.now());
    const intervalRef = useRef(null);
    const user = useSelector((state) => state.auth.user);

    const refreshSession = useCallback(async () => {
        try {
            const { default: apiClient } = await import('@/services/api/client/apiClient');
            await apiClient.post('auth/refresh-tokens');
        } catch {
            // Refresh will fail gracefully
        }
    }, []);

    useEffect(() => {
        if (!user) return;

        const updateActivity = () => { lastActivityRef.current = Date.now(); };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

        intervalRef.current = setInterval(() => {
            const idleMs = Date.now() - lastActivityRef.current;
            const twentyMinutes = 20 * 60 * 1000;
            if (idleMs < twentyMinutes) {
                refreshSession();
            }
        }, 5 * 60 * 1000);

        return () => {
            events.forEach((e) => window.removeEventListener(e, updateActivity));
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [user, refreshSession]);

    return null;
};

const App = () => {
    return (
        <AppProviders>
            <VersionInit />
            <SessionGate>
                <SocketInit />
                <SessionKeepAlive />
                <Suspense fallback={<FullPageLoader label="Loading…" />}>
                    <AppRoutes />
                </Suspense>
            </SessionGate>
            <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
        </AppProviders>
    );
};

export default App;
