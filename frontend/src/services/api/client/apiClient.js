import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        const tokens = JSON.parse(localStorage.getItem('token'));
        if (tokens && tokens.access) {
            config.headers['Authorization'] = `Bearer ${tokens.access.token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        // Handle specific error codes if needed (e.g., 401 for token refresh)
        return Promise.reject(error);
    }
);

export default apiClient;
