import apiClient from '@/services/api/client/apiClient';

const API_URL = 'users';
const INVOICE_URL = 'invoices';

const getUsers = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`${API_URL}?${query}`);
    return response.data;
};

const searchUsers = async ({ search, page, limit } = {}) => {
    // Backend reads `q` as the search term
    const params = {};
    if (search?.trim()) params.q = search.trim();
    if (page)  params.page  = page;
    if (limit) params.limit = limit;
    const response = await apiClient.get(`${API_URL}/search?${new URLSearchParams(params).toString()}`);
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
 * Admin: Fetch all unpaid or partially paid invoices for a month.
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
 * Admin: Update an invoice's paid amount (mark paid / partially paid / refunded).
 * @param {string} invoiceId
 * @param {number} paidAmount - new total paid amount
 * @param {number} [delta] - the actual amount entered (negative = refund)
 */
const updateInvoicePayment = async (invoiceId, paidAmount, delta) => {
    const payload = delta !== undefined ? { paidAmount, delta } : { paidAmount };
    const response = await apiClient.patch(`${INVOICE_URL}/${invoiceId}/payment`, payload);
    return response.data;
};

const membersService = {
    getUsers,
    searchUsers,
    approveUser,
    denyUser,
    updatePaymentStatus,
    bulkUpdateStatus,
    getBillingMonthStats,
    getAdminUnpaidInvoices,
    updateInvoicePayment,
};

export default membersService;
