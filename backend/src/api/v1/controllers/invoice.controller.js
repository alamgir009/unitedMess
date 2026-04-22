const invoiceService = require('../../../services/invoice.service');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const asyncHandler = require('../../../utils/helpers/asyncHandler');
const Invoice = require('../../../models/Invoice.model');
const AppError = require('../../../utils/errors/AppError');

/**
 * Get the active invoice for the current user
 */
const getActiveInvoice = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.getActiveInvoice(req.user.id);
    sendSuccessResponse(res, 200, 'Active invoice retrieved', invoice);
});

/**
 * GET /invoices/me/history
 * Get all invoices for the current user, sorted newest-first.
 */
const getInvoiceHistory = asyncHandler(async (req, res) => {
    const invoices = await invoiceService.getUserInvoiceHistory(req.user.id);
    sendSuccessResponse(res, 200, 'Invoice history retrieved', invoices);
});

/**
 * GET /invoices/me/month/:year/:month
 * Fetch (or auto-calculate) the invoice for a specific month/year.
 * Admins may pass ?userId=<id> to view another user's invoice.
 */
const getMonthlyInvoice = asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    if (!y || !m || m < 1 || m > 12) {
        throw new AppError('Invalid year or month parameter', 400);
    }

    // Admin can inspect any user's invoice; regular users see only their own.
    let targetUserId = req.user.id;
    if (req.user.role === 'admin' && req.query.userId) {
        targetUserId = req.query.userId;
    }

    const invoice = await invoiceService.getInvoiceForMonth(targetUserId, y, m);
    sendSuccessResponse(res, 200, 'Invoice retrieved', invoice);
});

/**
 * Admin: Finalize current month for all users
 */
const finalizeMonth = asyncHandler(async (req, res) => {
    const { month, year } = req.body;
    if (!month || !year) {
        throw new Error('Month and year are required');
    }
    const results = await invoiceService.finalizeMonth(month, year);
    sendSuccessResponse(res, 200, `Finalized invoices for ${month}/${year}`, { count: results.length });
});

/**
 * Get by ID (owner or admin)
 */
const getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) {
        throw new Error('Invoice not found');
    }

    // Security check: only the owner or an admin can view
    if (invoice.user.toString() !== req.user.id && req.user.role !== 'admin') {
        throw new Error('Not authorized to view this invoice');
    }

    sendSuccessResponse(res, 200, 'Invoice retrieved', invoice);
});

/**
 * Admin: Get finalized unpaid/partially-paid invoices for a given month.
 * GET /invoices/admin/unpaid?month=X&year=Y
 */
const getAdminUnpaidInvoices = asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    const invoices = await invoiceService.getAdminUnpaidInvoices(
        month ? parseInt(month, 10) : undefined,
        year  ? parseInt(year, 10)  : undefined
    );
    sendSuccessResponse(res, 200, 'Unpaid invoices retrieved', invoices);
});

/**
 * Admin: Update an invoice's paid amount and status.
 * PATCH /invoices/:id/payment
 * Body: { paidAmount: number }
 */
const updateInvoicePayment = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const { paidAmount } = req.body;
    if (paidAmount === undefined || isNaN(Number(paidAmount))) {
        throw new AppError('Valid paidAmount is required', 400);
    }

    invoice.paidAmount = Number(paidAmount);
    if (invoice.paidAmount >= invoice.totalPayable) invoice.status = 'paid';
    else if (invoice.paidAmount > 0)                invoice.status = 'partially_paid';
    else                                             invoice.status = 'unpaid';

    await invoice.save();
    sendSuccessResponse(res, 200, 'Invoice payment updated', invoice);
});

module.exports = {
    getActiveInvoice,
    getInvoiceHistory,
    getMonthlyInvoice,
    finalizeMonth,
    getInvoiceById,
    getAdminUnpaidInvoices,
    updateInvoicePayment,
};
