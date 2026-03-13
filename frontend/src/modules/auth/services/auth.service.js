import apiClient from '@/services/api/client/apiClient';
import Cookies from 'js-cookie';

const API_URL = 'auth/'; // Removed leading slash so axios doesn't overwrite baseURL path

// Register user
// Tokens arrive as httpOnly cookies set by the server — no localStorage token storage needed
const register = async (userData) => {
    const response = await apiClient.post(API_URL + 'register', userData);
    // Store user profile info for UI display; tokens are in httpOnly cookies
    if (response.data?.data?.user) {
        // Use cookie instead of localStorage for security
        Cookies.set('user', JSON.stringify(response.data.data.user), { expires: 7, secure: true, sameSite: 'strict' });
    }
    return response.data;
};

// Login user
const login = async (userData) => {
    const response = await apiClient.post(API_URL + 'login', userData);
    // Store user profile info for UI display; tokens are in httpOnly cookies
    if (response.data?.data?.user) {
        // Use cookie instead of localStorage for security
        Cookies.set('user', JSON.stringify(response.data.data.user), { expires: 7, secure: true, sameSite: 'strict' });
    }
    return response.data;
};

// Logout user
// The refreshToken is in an httpOnly cookie — the server reads it automatically
const logout = async () => {
    try {
        await apiClient.post(API_URL + 'logout');
    } finally {
        Cookies.remove('user');
    }
};

// Fetch payable amount
const getPayableAmount = async (userId) => {
    // If admin is viewing a specific user, use users/:userId/payable, otherwise use users/me/payable
    const endpoint = userId ? `users/${userId}/payable` : `users/me/payable`;
    // We use apiClient directly; it prepends the baseURL (/api/v1) automatically
    const response = await apiClient.get(endpoint);
    return response.data;
};

// Fetch payable gas bill amount
const getPayableGasBill = async (userId) => {
    const endpoint = userId ? `users/${userId}/payable/gasbill` : `users/me/payable/gasbill`;
    const response = await apiClient.get(endpoint);
    return response.data;
};

const authService = {
    register,
    logout,
    login,
    getPayableAmount,
    getPayableGasBill,
};

export default authService;

