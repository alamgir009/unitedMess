import { Suspense, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppProviders from './providers/AppProviders';
import AppRoutes from '@/routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import { restoreSession } from '@/modules/auth/store/auth.slice';
import { injectStore } from '@/services/api/client/apiClient';
import { store } from '@/store';
import { Spinner } from '@/shared/components/ui';

// Inject the Redux store into apiClient so the BroadcastChannel logout listener
// can dispatch setUser(null) without creating a circular import.
injectStore(store);

// ─────────────────────────────────────────────────────────────────────────────
// FullScreenLoader — matches the design language used across the whole app
// (same Spinner component, same glass-card aesthetic as meal/market/dashboard).
// ─────────────────────────────────────────────────────────────────────────────
const FullScreenLoader = ({ label = 'Loading…' }) => (
    <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background"
        role="status"
        aria-label={label}
    >
        {/* Ambient orb — identical to the ones on MealPage / DashboardPage */}
        <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-primary/5 to-transparent" />
        <div className="pointer-events-none absolute bottom-10 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary-400/10 via-secondary-400/5 to-transparent" />

        {/* Glass card wrapper */}
        <div className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-3xl border border-white/10 dark:border-white/5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl">
            <Spinner size="xl" color="primary" />
            <p className="text-sm font-semibold text-muted-foreground tracking-wide">
                {label}
            </p>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SessionGate
// ─────────────────────────────────────────────────────────────────────────────
// Lives INSIDE <Provider> so it can dispatch to Redux.
// Dispatches restoreSession on mount and holds the full app behind a loader
// until the result (success or failure) settles — preventing any premature
// redirect to /login before the httpOnly refresh cookie has been validated.
// ─────────────────────────────────────────────────────────────────────────────
const SessionGate = ({ children }) => {
    const dispatch = useDispatch();
    const sessionRestoring = useSelector((state) => state.auth.sessionRestoring);

    useEffect(() => {
        dispatch(restoreSession());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (sessionRestoring) {
        return <FullScreenLoader label="Restoring session…" />;
    }

    return children;
};

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
const App = () => {
    return (
        <AppProviders>
            <SessionGate>
                <Suspense fallback={<FullScreenLoader label="Loading…" />}>
                    <AppRoutes />
                </Suspense>
            </SessionGate>
            <Toaster position="top-right" />
        </AppProviders>
    );
};

export default App;
