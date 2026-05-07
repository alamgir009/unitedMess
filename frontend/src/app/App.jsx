import { Suspense, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppProviders from './providers/AppProviders';
import AppRoutes from '@/routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import { restoreSession } from '@/modules/auth/store/auth.slice';
import { injectStore } from '@/services/api/client/apiClient';
import { store } from '@/store';

// Inject the Redux store into apiClient so the BroadcastChannel logout listener
// can dispatch setUser(null) without creating a circular import.
injectStore(store);

// ─────────────────────────────────────────────────────────────────────────────
// SessionGate
// ─────────────────────────────────────────────────────────────────────────────
// Lives INSIDE <Provider> so it can dispatch to Redux.
//
// On mount it dispatches restoreSession which:
//   1. POSTs to /auth/refresh-token (httpOnly cookie sent automatically)
//   2. Stores new accessToken in memory, user in Redux
//   3. Sets sessionRestoring = false
//
// While sessionRestoring is true the entire app tree is replaced with a
// full-screen spinner, preventing any premature redirect to /login.
// ─────────────────────────────────────────────────────────────────────────────
const SessionGate = ({ children }) => {
    const dispatch = useDispatch();
    const sessionRestoring = useSelector((state) => state.auth.sessionRestoring);

    useEffect(() => {
        dispatch(restoreSession());
        // Intentionally empty dep array — run once on mount only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (sessionRestoring) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    width: '100vw',
                    background: 'var(--color-bg, #0f172a)',
                }}
                aria-label="Restoring session…"
                role="status"
            >
                <div
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        border: '3px solid rgba(99,102,241,0.2)',
                        borderTopColor: '#6366f1',
                        animation: 'spin 0.75s linear infinite',
                    }}
                />
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return children;
};

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
// <AppProviders> wraps <Provider store={store}> which means SessionGate has
// full access to Redux dispatch/select. The old pattern ran restoreSession()
// BEFORE the Provider was mounted, so it could never write to Redux.
// ─────────────────────────────────────────────────────────────────────────────
const App = () => {
    return (
        <AppProviders>
            <SessionGate>
                <Suspense
                    fallback={
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100vh',
                            }}
                        >
                            Loading…
                        </div>
                    }
                >
                    <AppRoutes />
                </Suspense>
            </SessionGate>
            <Toaster position="top-right" />
        </AppProviders>
    );
};

export default App;
