import apiClient, { setAccessToken, clearAccessToken } from '@/services/api/client/apiClient';
import Cookies from 'js-cookie';

const API_URL = 'auth/';

// User profile cookie options.
// This cookie is NOT the auth token — it is only a UI hint (display name, avatar URL).
// The real authentication is done via the httpOnly refresh cookie managed by the server.
// Expiry deliberately aligns with server refresh token (7 days) so they expire together.
const USER_COOKIE_OPTS = { expires: 7, secure: true, sameSite: 'strict' };

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
const register = async (userData) => {
    const response = await apiClient.post(API_URL + 'register', userData);
    return response.data;
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
// After a successful login:
//   • Server sets:  httpOnly refresh cookie  (7 days, invisible to JS)
//   • Server sets:  httpOnly access cookie   (24h, SSR fallback)
//   • Server body:  { tokens: { accessToken }, user }
//
// Frontend stores:
//   • accessToken → in-memory (this module variable, cleared on page close)
//   • user        → js-cookie (display hint) + Redux state
//   • refreshToken → NOT stored anywhere on frontend (httpOnly cookie handles it)
// ---------------------------------------------------------------------------
const login = async (userData) => {
    const response = await apiClient.post(API_URL + 'login', userData);

    const accessToken = response.data?.data?.tokens?.accessToken;
    const user        = response.data?.data?.user;

    if (accessToken) setAccessToken(accessToken);

    if (user && typeof user === 'object' && user._id) {
        Cookies.set('user', JSON.stringify(user), USER_COOKIE_OPTS);
    }

    return response.data;
};

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
// Server will clear the httpOnly refresh + access cookies via Set-Cookie headers.
// Frontend only needs to clear the in-memory access token and the display cookie.
// ---------------------------------------------------------------------------
const logout = async () => {
    try {
        await apiClient.post(API_URL + 'logout');
    } finally {
        clearAccessToken();
        Cookies.remove('user');
    }
};

// ---------------------------------------------------------------------------
// Get current user profile (used during session restore)
// ---------------------------------------------------------------------------
const getMe = async () => {
    const response = await apiClient.get('users/me');
    return response.data;
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
    getMe,
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
        return response.data;
    },
};

export default authService;
