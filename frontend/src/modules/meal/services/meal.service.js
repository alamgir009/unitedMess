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

const mealService = {
    getMeals,
    createMeal,
    updateMeal,
    deleteMeal,
    adminGetUserMeals,
    adminCreateMeal,
    adminUpdateMeal,
    adminDeleteMeal,
};

export default mealService;