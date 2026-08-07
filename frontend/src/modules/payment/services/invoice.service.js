/**
 * invoice.service.js
 *
 * API client for the invoice module.
 * All calls go through the shared apiClient which handles auth tokens and base URL.
 */

import apiClient from '@/services/api/client/apiClient';

const BASE = 'invoices';

/**
 * Fetches the currently active invoice based on the 10th-day business rule.
 * Days 1–10 → previous month's invoice.
 * Days 11+ → current month's live invoice.
 */
const getActiveInvoice = async () => {
    const res = await apiClient.get(`${BASE}/me/active`);
    return res.data; // { success, message, data: Invoice }
};

/**
 * Full invoice history for the logged-in user, sorted newest-first.
 * @returns {{ success, message, data: Invoice[] }}
 */
const getInvoiceHistory = async () => {
    const res = await apiClient.get(`${BASE}/me/history`);
    return res.data;
};

/**
 * Fetch the invoice for a specific year/month.
 * Used when clicking "View Invoice" on a payment history item.
 *
 * @param {number} year   — e.g. 2026
 * @param {number} month  — 1-indexed (1 = January, 12 = December)
 * @param {string} [userId] — optional userId for admin viewing another user's invoice
 * @returns {{ success, message, data: Invoice }}
 */
const getInvoiceForMonth = async (year, month, userId) => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await apiClient.get(`${BASE}/me/month/${year}/${month}${query}`);
    return res.data;
};

/**
 * Fetch a single invoice by its MongoDB ObjectId.
 * @param {string} invoiceId
 */
const getInvoiceById = async (invoiceId) => {
    const res = await apiClient.get(`${BASE}/${invoiceId}`);
    return res.data;
};

/**
 * Admin: manually trigger finalization for a given month/year.
 * @param {number} month — 1-indexed
 * @param {number} year
 */
const finalizeMonth = async (month, year) => {
    const res = await apiClient.post(`${BASE}/finalize`, { month, year });
    return res.data;
};

/**
 * Download invoice PDF from server — triggers browser file download.
 * @param {number} year   — e.g. 2026
 * @param {number} month  — 1-indexed (1 = January, 12 = December)
 * @param {string} [userId] — optional userId for admin viewing another user's invoice
 */
const downloadInvoice = async (year, month, userId) => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await apiClient.get(`${BASE}/me/month/${year}/${month}/download${query}`, {
        responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UnitedMess_Invoice_${year}_${String(month).padStart(2, '0')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Request server to generate and email the invoice PDF.
 * @param {number} year   — e.g. 2026
 * @param {number} month  — 1-indexed (1 = January, 12 = December)
 * @param {string} [userId] — optional userId for admin sending on behalf of another user
 */
const sendInvoiceEmail = async (year, month, userId) => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await apiClient.post(`${BASE}/me/month/${year}/${month}/email${query}`);
    return res.data;
};

/**
 * Admin: send invoice summary email to all active approved members.
 * @param {{ month?: number, year?: number }} [params] — optional, defaults to current billing period
 */
const emailAllInvoices = async (params) => {
    const res = await apiClient.post(`${BASE}/admin/email-all`, params || {});
    return res.data;
};

const invoiceService = {
    getActiveInvoice,
    getInvoiceHistory,
    getInvoiceForMonth,
    getInvoiceById,
    finalizeMonth,
    downloadInvoice,
    sendInvoiceEmail,
    emailAllInvoices,
};

export default invoiceService;
