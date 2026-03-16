import axios from 'axios';
import Cookies from 'js-cookie';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/v1',
    withCredentials: true, // Send httpOnly cookies with every request
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — httpOnly cookies are sent automatically by the browser
apiClient.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
);

// Track whether a refresh is already in progress to avoid infinite loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve();
        }
    });
    failedQueue = [];
};

// Response interceptor — auto-refresh accessToken on 401
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only try refresh once per request
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('refresh-token') &&
            !originalRequest.url?.includes('login')
        ) {
            if (isRefreshing) {
                // Queue the request until refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => apiClient(originalRequest))
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Try to refresh the access token using the refreshToken httpOnly cookie
                await apiClient.post('auth/refresh-token');
                processQueue(null);
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                // If refresh also fails, clear the user session and redirect to login
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
