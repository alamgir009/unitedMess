import apiClient, { setAccessToken, setRefreshToken, clearAllTokens } from '@/services/api/client/apiClient';
import Cookies from 'js-cookie';

const API_URL = 'auth/';

// User profile cookie options (NOT the auth token — just UI display data)
const USER_COOKIE_OPTS = { expires: 7, secure: true, sameSite: 'lax' };

// ---------------------------------------------------------------------------
// Helper — persist tokens returned in login / refresh responses
// ---------------------------------------------------------------------------
const storeTokensFromResponse = (responseData) => {
    const tokens = responseData?.data?.tokens;
    if (tokens?.accessToken)  setAccessToken(tokens.accessToken);
    if (tokens?.refreshToken) setRefreshToken(tokens.refreshToken);
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
const register = async (userData) => {
    const response = await apiClient.post(API_URL + 'register', userData);
    if (response.data?.data?.user) {
        Cookies.set('user', JSON.stringify(response.data.data.user), USER_COOKIE_OPTS);
    }
    return response.data;
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
const login = async (userData) => {
    const response = await apiClient.post(API_URL + 'login', userData);

    if (response.data?.data?.user) {
        Cookies.set('user', JSON.stringify(response.data.data.user), USER_COOKIE_OPTS);
    }

    // Store tokens in memory + localStorage so all subsequent requests are authenticated
    // even when cross-origin cookies are blocked by the browser.
    storeTokensFromResponse(response.data);

    return response.data;
};

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
const logout = async () => {
    try {
        await apiClient.post(API_URL + 'logout');
    } finally {
        clearAllTokens();
        Cookies.remove('user');
    }
};

// ---------------------------------------------------------------------------
// Payable amounts
// ---------------------------------------------------------------------------
const getPayableAmount = async (userId) => {
    const endpoint = userId ? `users/${userId}/payable` : `users/me/payable`;
    const response = await apiClient.get(endpoint);
    return response.data;
};

const getPayableGasBill = async (userId) => {
    const endpoint = userId ? `users/${userId}/payable/gasbill` : `users/me/payable/gasbill`;
    const response = await apiClient.get(endpoint);
    return response.data;
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
const authService = {
    register,
    login,
    logout,
    getPayableAmount,
    getPayableGasBill,

    updateProfile: async (userData) => {
        const response = await apiClient.patch('users/me', userData);
        const updatedUser = response.data?.data?.user || response.data?.data || response.data?.user;
        if (updatedUser && typeof updatedUser === 'object' && updatedUser._id) {
            Cookies.set('user', JSON.stringify(updatedUser), USER_COOKIE_OPTS);
        }
        return response.data;
    },

    updateAvatar: async (formData) => {
        const response = await apiClient.patch('users/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const updatedUser = response.data?.data;
        if (updatedUser && typeof updatedUser === 'object' && updatedUser._id) {
            Cookies.set('user', JSON.stringify(updatedUser), USER_COOKIE_OPTS);
        }
        return response.data;
    },

    forgotPassword: async (email) => {
        const response = await apiClient.post(API_URL + 'forgot-password', { email });
        return response.data;
    },

    resetPassword: async (token, password) => {
        const response = await apiClient.post(API_URL + `reset-password/${token}`, { password });
        return response.data;
    },

    resendVerification: async (email) => {
        const response = await apiClient.post(API_URL + 'resend-verification', { email });
        return response.data;
    },

    deactivateAccount: async () => {
        const response = await apiClient.delete('users/me');
        // Upon successful deactivation, we might need to clear tokens/cookies. 
        // This can also be handled in the slice/logout flow.
        return response.data;
    },
};

export default authService;
