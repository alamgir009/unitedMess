import apiClient from '@/services/api/client/apiClient';

const API_URL = 'users';
const INVOICE_URL = 'invoices';

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

/**
 * Fetch current billing-month aggregated stats (meal count, market total, meal rate).
 * Uses the 10th-day rule on the backend — always returns the correct period.
 */
const getBillingMonthStats = async () => {
    const response = await apiClient.get(`${API_URL}/stats/billing-month`);
    return response.data;
};

/**
 * Admin: Fetch all finalized invoices that are unpaid or partially paid.
 * @param {number} [month] - 1-indexed month (optional)
 * @param {number} [year]  - full year (optional)
 */
const getAdminUnpaidInvoices = async (month, year) => {
    const params = {};
    if (month) params.month = month;
    if (year)  params.year  = year;
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${INVOICE_URL}/admin/unpaid${query ? `?${query}` : ''}`);
    return response.data;
};

/**
 * Admin: Update an invoice's paid amount (mark paid / partially paid).
 * @param {string} invoiceId
 * @param {number} paidAmount
 */
const updateInvoicePayment = async (invoiceId, paidAmount) => {
    const response = await apiClient.patch(`${INVOICE_URL}/${invoiceId}/payment`, { paidAmount });
    return response.data;
};

const membersService = {
    getUsers,
    searchUsers,
    approveUser,
    denyUser,
    updatePaymentStatus,
    updateGasBillStatus,
    bulkUpdateStatus,
    getBillingMonthStats,
    getAdminUnpaidInvoices,
    updateInvoicePayment,
};

export default membersService;
