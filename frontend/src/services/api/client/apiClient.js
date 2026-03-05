import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/v1',
    withCredentials: true, // Send httpOnly cookies with every request
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — no manual token injection needed,
// the browser automatically sends httpOnly cookies
apiClient.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Handle specific error codes if needed (e.g., 401 for token refresh)
        return Promise.reject(error);
    }
);

export default apiClient;
