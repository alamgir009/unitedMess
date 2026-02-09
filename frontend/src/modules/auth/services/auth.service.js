import apiClient from '@/services/api/client/apiClient';

const API_URL = '/auth/';

// Register user
const register = async (userData) => {
    const response = await apiClient.post(API_URL + 'register', userData);
    if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', JSON.stringify(response.data.tokens));
    }
    return response.data;
};

// Login user
const login = async (userData) => {
    const response = await apiClient.post(API_URL + 'login', userData);
    if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', JSON.stringify(response.data.tokens));
    }
    return response.data;
};

// Logout user
const logout = async () => {
    try {
        const tokens = JSON.parse(localStorage.getItem('token'));
        if (tokens && tokens.refresh) {
            await apiClient.post(API_URL + 'logout', { refreshToken: tokens.refresh.token });
        }
    } finally {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }
};

const authService = {
    register,
    logout,
    login,
};

export default authService;
