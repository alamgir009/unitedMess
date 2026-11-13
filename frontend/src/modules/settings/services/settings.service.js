import apiClient from '@/services/api/client/apiClient';

const updateGuestMealCharge = (data) => {
    return apiClient.patch('/setting/guest-meal-charge', data);
};

const updateCookingCharge = (data) => {
    return apiClient.patch('/setting/cooking-charge', data);
};

const updateWaterBill = (data) => {
    return apiClient.patch('/setting/water-bill', data);
};

const updateGasBillCharge = (data) => {
    return apiClient.patch('/setting/gas-bill', data);
};

const updatePlatformFee = (data) => {
    return apiClient.patch('/setting/platform-fee', data);
};

// Overdue-penalty global rate — lives on the invoice module (GET/PUT
// /invoices/admin/penalty-rate, admin-only on the backend).
const getPenaltyRate = () => {
    return apiClient.get('/invoices/admin/penalty-rate');
};

const updatePenaltyRate = (data) => {
    return apiClient.put('/invoices/admin/penalty-rate', data);
};

const settingsService = {
    updateGuestMealCharge,
    updateCookingCharge,
    updateWaterBill,
    updateGasBillCharge,
    updatePlatformFee,
    getPenaltyRate,
    updatePenaltyRate,
};

export default settingsService;
