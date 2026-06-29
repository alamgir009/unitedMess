import axios from 'axios';

// ---------------------------------------------------------------------------
// Auth broadcast channel — synchronises login/logout state across browser tabs
// without storing any tokens in localStorage/sessionStorage.
// ---------------------------------------------------------------------------
export const authChannel = (() => {
    try {
        return new BroadcastChannel('um_auth');
    } catch {
        // BroadcastChannel not supported (very old browsers / SSR) — no-op fallback
        return { postMessage: () => {}, addEventListener: () => {}, close: () => {} };
    }
})();

// ---------------------------------------------------------------------------
// In-memory access token — lives ONLY in this module's closure.
// Cleared on every page refresh (intentional). Invisible to XSS scripts.
// Refresh token lives EXCLUSIVELY in an httpOnly cookie managed by the server.
// ---------------------------------------------------------------------------
let inMemoryAccessToken = null;

export const setAccessToken  = (token) => { inMemoryAccessToken = token; };
export const getAccessToken  = ()      => inMemoryAccessToken;
export const clearAccessToken = ()     => { inMemoryAccessToken = null; };

// ---------------------------------------------------------------------------
// Store reference — injected lazily by SessionGate to avoid circular imports.
// Used by the BroadcastChannel listener to dispatch actions from outside React.
// ---------------------------------------------------------------------------
let _store = null;
export const injectStore = (store) => { _store = store; };

// ---------------------------------------------------------------------------
// Axios instance
// withCredentials: true  → browser sends the httpOnly refresh cookie automatically
//                          on every request to the same origin (and cross-origin
//                          if the server allows it via CORS credentials).
// X-Requested-With       → extra CSRF layer; server can reject requests missing this.
// ---------------------------------------------------------------------------
const apiClient = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/v1` || 'https://api.unitedmess.uk/api/v1',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // CSRF guard
    },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token from memory on every request.
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
    (config) => {
        if (inMemoryAccessToken) {
            config.headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
        }
        // Let browser auto-set Content-Type with boundary for FormData
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — silent token rotation on 401.
//
// Flow:
//   1. Request fails with 401.
//   2. If not already refreshing, call POST /auth/refresh-token.
//      The httpOnly refresh cookie is sent automatically — no body needed.
//   3. Store new access token in memory, retry original request.
//   4. If refresh fails (cookie expired/revoked): clear state, force login.
//
// Race condition guard:
//   isRefreshing flag + failedQueue prevent multiple simultaneous refresh calls
//   within the same tab. Cross-tab races are handled by BroadcastChannel.
// ---------------------------------------------------------------------------
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) =>
        error ? prom.reject(error) : prom.resolve(token)
    );
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('refresh-tokens') &&
            !originalRequest.url?.includes('login') &&
            !originalRequest.url?.includes('logout')
        ) {
            // Another tab already refreshed — queue and wait
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // No body needed — httpOnly cookie is sent automatically by the browser.
                const refreshRes = await apiClient.post('auth/refresh-tokens');

                const newAccessToken = refreshRes.data?.data?.tokens?.accessToken;

                if (!newAccessToken) throw new Error('No access token in refresh response');

                setAccessToken(newAccessToken);
                processQueue(null, newAccessToken);

                // Notify other tabs that the token has been refreshed
                authChannel.postMessage({ type: 'TOKEN_REFRESHED' });

                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);

                // Unrecoverable — clear in-memory token and force full logout
                clearAccessToken();

                // Notify other tabs so they also log out cleanly
                authChannel.postMessage({ type: 'AUTH_LOGOUT' });

                // Dispatch logout to Redux if store is available (avoids import cycle)
                if (_store) {
                    const { setUser, setSessionReady } = await import(
                        '@/modules/auth/store/auth.slice'
                    );
                    _store.dispatch(setUser(null));
                    _store.dispatch(setSessionReady());
                }

                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// ---------------------------------------------------------------------------
// Cross-tab sync listener
// When another tab logs out, we clear our in-memory state immediately.
// TOKEN_REFRESHED from another tab is intentionally ignored:
//   With token rotation, the other tab consumed the old refreshToken. If we
//   tried to refresh here we'd get 401 (token not found), which would then
//   incorrectly set user=null and dispatch AUTH_LOGOUT — logging ALL tabs out.
//   Instead, we rely on the response interceptor: the next 401 on THIS tab
//   will naturally trigger a fresh refresh with the rotated cookie.
// ---------------------------------------------------------------------------
authChannel.addEventListener?.('message', async (event) => {
    if (event.data?.type === 'AUTH_LOGOUT') {
        clearAccessToken();
        if (_store) {
            const { setUser } = await import('@/modules/auth/store/auth.slice');
            _store.dispatch(setUser(null));
        }
    }
});

export default apiClient;
