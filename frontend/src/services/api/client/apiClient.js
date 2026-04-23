import axios from 'axios';
import Cookies from 'js-cookie';

// ---------------------------------------------------------------------------
// In-memory token store
// Access token lives ONLY in memory (cleared on page refresh — intentional).
// Refresh token lives in localStorage so it survives page refreshes.
// This pattern avoids cross-origin cookie issues between pages.dev & onrender.com.
// ---------------------------------------------------------------------------
let inMemoryAccessToken = null;

export const setAccessToken  = (token) => { inMemoryAccessToken = token; };
export const getAccessToken  = ()      => inMemoryAccessToken;
export const clearAccessToken = ()     => { inMemoryAccessToken = null; };

export const setRefreshToken  = (token) => localStorage.setItem('refreshToken', token);
export const getRefreshToken  = ()      => localStorage.getItem('refreshToken');
export const clearRefreshToken = ()     => localStorage.removeItem('refreshToken');

export const clearAllTokens = () => {
    clearAccessToken();
    clearRefreshToken();
};

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const apiClient = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/v1` || 'https://unitedmess.onrender.com/api/v1',
    withCredentials: true, // keep for httpOnly cookie fallback on same-origin
    headers: {
        'Content-Type': 'application/json',
    },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token from memory on every request
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
    (config) => {
        if (inMemoryAccessToken) {
            config.headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — auto-refresh on 401 using localStorage refresh token
// ---------------------------------------------------------------------------
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error) => {
    failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve()));
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('refresh-token') &&
            !originalRequest.url?.includes('login')
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => apiClient(originalRequest))
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const storedRefreshToken = getRefreshToken();

                // Send refresh token both as body (reliable) and rely on httpOnly cookie fallback
                const refreshRes = await apiClient.post('auth/refresh-token', {
                    refreshToken: storedRefreshToken || undefined,
                });

                const newAccessToken  = refreshRes.data?.data?.tokens?.accessToken;
                const newRefreshToken = refreshRes.data?.data?.tokens?.refreshToken;

                if (newAccessToken)  setAccessToken(newAccessToken);
                if (newRefreshToken) setRefreshToken(newRefreshToken);

                processQueue(null);
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                // Full session clear on unrecoverable refresh failure
                clearAllTokens();
                Cookies.remove('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
