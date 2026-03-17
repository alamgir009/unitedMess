import apiClient from '@/services/api/client/apiClient';

const API_URL = 'users';

const getUsers = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${API_URL}?${query}`);
    return response.data;
};

const searchUsers = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${API_URL}/search?${query}`);
    return response.data;
};

const approveUser = async (userId) => {
    const response = await apiClient.post(`${API_URL}/${userId}/approve`);
    return response.data;
};

const denyUser = async (userId) => {
    const response = await apiClient.post(`${API_URL}/${userId}/deny`);
    return response.data;
};

const updatePaymentStatus = async (userId, paymentData) => {
    const response = await apiClient.patch(`${API_URL}/${userId}/payment`, paymentData);
    return response.data;
};

const updateGasBillStatus = async (userId, gasBillData) => {
    const response = await apiClient.patch(`${API_URL}/${userId}/gas-bill`, gasBillData);
    return response.data;
};

const bulkUpdateStatus = async (statusData) => {
    const response = await apiClient.patch(`${API_URL}/bulk/status`, statusData);
    return response.data;
};

const membersService = {
    getUsers,
    searchUsers,
    approveUser,
    denyUser,
    updatePaymentStatus,
    updateGasBillStatus,
    bulkUpdateStatus
};

export default membersService;
