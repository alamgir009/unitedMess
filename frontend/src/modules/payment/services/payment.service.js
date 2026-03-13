import apiClient from '@/services/api/client/apiClient';

const API_URL = 'payments';

// Get all payments (admin: all, user: own)
const getPayments = async (params = { page: 1, limit: 20 }) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${API_URL}?${query}`);
    return response.data;
};

// Get single payment
const getPaymentById = async (paymentId) => {
    const response = await apiClient.get(`${API_URL}/${paymentId}`);
    return response.data;
};

// Create cash / manual payment
const createPayment = async (paymentData) => {
    const response = await apiClient.post(API_URL, paymentData);
    return response.data;
};

// Create Razorpay order (returns { order, payment })
const createOnlineOrder = async ({ amount, type }) => {
    const response = await apiClient.post(`${API_URL}/order`, { amount, type });
    return response.data;
};

// Verify Razorpay payment signature
const verifyPayment = async ({ orderId, paymentId, signature }) => {
    const response = await apiClient.post(`${API_URL}/verify`, { orderId, paymentId, signature });
    return response.data;
};

// Admin: update any payment
const updatePayment = async (paymentId, paymentData) => {
    const response = await apiClient.patch(`${API_URL}/${paymentId}`, paymentData);
    return response.data;
};

// Admin: delete any payment
const deletePayment = async (paymentId) => {
    const response = await apiClient.delete(`${API_URL}/${paymentId}`);
    return response.data;
};

// Send invoice email to the user after successful payment
const sendInvoiceEmail = async (paymentId) => {
    const response = await apiClient.post(`${API_URL}/${paymentId}/invoice-email`);
    return response.data;
};

const paymentService = {
    getPayments,
    getPaymentById,
    createPayment,
    createOnlineOrder,
    verifyPayment,
    updatePayment,
    deletePayment,
    sendInvoiceEmail,
};

export default paymentService;
