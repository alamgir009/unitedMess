import apiClient from '@/services/api/client/apiClient';

const API_URL = 'markets';
const ADMIN_API_URL = 'markets/admin/users';

// --- Authenticated User Routes ---

// Get all market for the authenticated user
const getMarkets = async (params = { page: 1, limit: 10 }) => {
    // Convert object to query string
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${API_URL}?${query}`);
    return response.data;
};

// Get monthly market schedule
const getMarketSchedule = async (year, month) => {
    const response = await apiClient.get(`${API_URL}/schedule/${year}/${month}`);
    return response.data;
};

// Create a new market for the current user
const createMarket = async (marketData) => {
    const response = await apiClient.post(API_URL, marketData);
    return response.data;
};

// Update a specific market for the current user
const updateMarket = async (marketId, marketData) => {
    const response = await apiClient.patch(`${API_URL}/${marketId}`, marketData);
    return response.data;
};

// Delete a specific market for the current user
const deleteMarket = async (marketId) => {
    const response = await apiClient.delete(`${API_URL}/${marketId}`);
    return response.data;
};

// --- Admin Routes ---

// Get all markets for a specific user (Admin)
const adminGetUserMarkets = async (userId, params = { page: 1, limit: 10 }) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${ADMIN_API_URL}/${userId}/markets?${query}`);
    return response.data;
};

// Create a market for a specific user (Admin)
const adminCreateMarket = async (userId, marketData) => {
    const response = await apiClient.post(`${ADMIN_API_URL}/${userId}/markets`, marketData);
    return response.data;
};

// Update a market for a specific user (Admin)
const adminUpdateMarket = async (userId, marketId, marketData) => {
    const response = await apiClient.patch(`${ADMIN_API_URL}/${userId}/markets/${marketId}`, marketData);
    return response.data;
};

// Delete a market for a specific user (Admin)
const adminDeleteMarket = async (userId, marketId) => {
    const response = await apiClient.delete(`${ADMIN_API_URL}/${userId}/markets/${marketId}`);
    return response.data;
};

const marketService = {
    getMarkets,
    getMarketSchedule,
    createMarket,
    updateMarket,
    deleteMarket,
    adminGetUserMarkets,
    adminCreateMarket,
    adminUpdateMarket,
    adminDeleteMarket,
};

export default marketService;