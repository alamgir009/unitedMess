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

const settingsService = {
    updateGuestMealCharge,
    updateCookingCharge,
    updateWaterBill,
    updateGasBillCharge,
    updatePlatformFee,
};

export default settingsService;
