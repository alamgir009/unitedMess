import { Suspense, useEffect, useState } from 'react';
import AppProviders from './providers/AppProviders';
import AppRoutes from '@/routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import apiClient, {
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
    clearAllTokens,
} from '@/services/api/client/apiClient';
import Cookies from 'js-cookie';

// ---------------------------------------------------------------------------
// Silently restore the in-memory access token from the refresh token stored
// in localStorage. This is necessary because the access token lives only in
// memory and is lost on every page refresh.
// ---------------------------------------------------------------------------
const restoreSession = async () => {
    const storedRefreshToken = getRefreshToken();
    if (!storedRefreshToken) return; // No previous session — nothing to restore

    try {
        const res = await apiClient.post('auth/refresh-token', {
            refreshToken: storedRefreshToken,
        });
        const tokens = res.data?.data?.tokens;
        if (tokens?.accessToken)  setAccessToken(tokens.accessToken);
        if (tokens?.refreshToken) setRefreshToken(tokens.refreshToken);
    } catch {
        // Refresh token is invalid/expired — clear stale data so the user
        // is cleanly sent to the login page rather than looping on 401s.
        clearAllTokens();
        Cookies.remove('user');
    }
};

const App = () => {
    // Block rendering until session restore is complete so ProtectedRoute
    // doesn't redirect to /login before the access token is in memory.
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        restoreSession().finally(() => setSessionReady(true));
    }, []);

    if (!sessionReady) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <AppProviders>
            <Suspense
                fallback={
                    <div className="flex items-center justify-center h-screen">
                        Loading...
                    </div>
                }
            >
                <AppRoutes />
            </Suspense>
            <Toaster position="top-right" />
        </AppProviders>
    );
};

export default App;
