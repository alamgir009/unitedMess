import apiClient from '@/services/api/client/apiClient';

const API_URL = 'meals';
const ADMIN_API_URL = 'meals/admin/users';

// --- Authenticated User Routes ---

// Get all meals for the authenticated user
const getMeals = async (params = { page: 1, limit: 10 }) => {
    // Convert object to query string
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${API_URL}?${query}`);
    return response.data;
};

// Create a new meal for the current user
const createMeal = async (mealData) => {
    const response = await apiClient.post(API_URL, mealData);
    return response.data;
};

// Bulk create meals for date range and multiple users
const bulkCreateMeals = async (bulkData) => {
    const response = await apiClient.post(`${API_URL}/bulk`, bulkData);
    return response.data;
};

// Bulk delete multiple meals by IDs
const bulkDeleteMeals = async (mealIds) => {
    const response = await apiClient.post(`${API_URL}/bulk-delete`, { mealIds });
    return response.data;
};

// Update a specific meal for the current user
const updateMeal = async (mealId, mealData) => {
    const response = await apiClient.patch(`${API_URL}/${mealId}`, mealData);
    return response.data;
};

// Delete a specific meal for the current user
const deleteMeal = async (mealId) => {
    const response = await apiClient.delete(`${API_URL}/${mealId}`);
    return response.data;
};

// --- Admin Routes ---

// Get all meals for a specific user (Admin)
const adminGetUserMeals = async (userId, params = { page: 1, limit: 10 }) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${ADMIN_API_URL}/${userId}/meals?${query}`);
    return response.data;
};

// Create a meal for a specific user (Admin)
const adminCreateMeal = async (userId, mealData) => {
    const response = await apiClient.post(`${ADMIN_API_URL}/${userId}/meals`, mealData);
    return response.data;
};

// Update a meal for a specific user (Admin)
const adminUpdateMeal = async (userId, mealId, mealData) => {
    const response = await apiClient.patch(`${ADMIN_API_URL}/${userId}/meals/${mealId}`, mealData);
    return response.data;
};

// Delete a meal for a specific user (Admin)
const adminDeleteMeal = async (userId, mealId) => {
    const response = await apiClient.delete(`${ADMIN_API_URL}/${userId}/meals/${mealId}`);
    return response.data;
};

// --- Polling Routes ---

const voteMealPoll = async (pollData) => {
    const response = await apiClient.post(`${API_URL}/poll/vote`, pollData);
    return response.data;
};

const getMealPollStatus = async (date) => {
    const response = await apiClient.get(`${API_URL}/poll/status?date=${date}`);
    return response.data;
};

// --- Poll Audit Log Routes (Admin) ---

const AUDIT_API_URL = `${API_URL}/poll/audit`;

const getAuditMonths = async () => {
    const response = await apiClient.get(`${AUDIT_API_URL}/months`);
    return response.data;
};

const getAuditDays = async (monthKey, params = { page: 1, limit: 50 }) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${AUDIT_API_URL}/month/${monthKey}?${query}`);
    return response.data;
};

const getAuditLogsByDay = async (dayKey, params = { page: 1, limit: 50 }) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${AUDIT_API_URL}/day/${dayKey}?${query}`);
    return response.data;
};

const mealService = {
    getMeals,
    createMeal,
    bulkCreateMeals,
    bulkDeleteMeals,
    updateMeal,
    deleteMeal,
    adminGetUserMeals,
    adminCreateMeal,
    adminUpdateMeal,
    adminDeleteMeal,
    voteMealPoll,
    getMealPollStatus,
    getAuditMonths,
    getAuditDays,
    getAuditLogsByDay,
};

export default mealService;