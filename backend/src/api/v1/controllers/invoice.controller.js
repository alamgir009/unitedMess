const invoiceService = require('../../../services/invoice.service');
const pdfService = require('../../../services/pdf.service');
const emailService = require('../../../services/email.service');
const notificationService = require('../../../services/notification.service');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const { getBillingPeriod } = require('../../../utils/helpers/date.helper');
const asyncHandler = require('../../../utils/helpers/asyncHandler');
const logger = require('../../../utils/logger');
const Invoice = require('../../../models/Invoice.model');
const Payment = require('../../../models/Payment.model');
const User = require('../../../models/User.model');
const AppError = require('../../../utils/errors/AppError');
const { emitToAll } = require('../../../sockets');

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

    // Parallel: fetch invoice + mess-wide stats (independent queries)
    const [invoice, messStats] = await Promise.all([
        invoiceService.getInvoiceForMonth(targetUserId, y, m),
        invoiceService.calculateMessStats(m, y),
    ]);

    // Attach mess-wide stats so the frontend can render the exact PDF stat cards
    invoice._messGrandTotalMarket = messStats.totalMarketAmount;
    invoice._messGrandTotalMeal = messStats.totalMealCount;

    sendSuccessResponse(res, 200, 'Invoice retrieved', invoice);
});

/**
 * Admin: Finalize current month for all users
 */
const finalizeMonth = asyncHandler(async (req, res) => {
    const { month, year } = req.body;
    if (!month || !year) {
        throw new AppError('Month and year are required', 400);
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
        throw new AppError('Invoice not found', 404);
    }

    // Security check: only the owner or an admin can view
    if (invoice.user.toString() !== req.user.id && req.user.role !== 'admin') {
        throw new AppError('Not authorized to view this invoice', 403);
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
 * Body: { paidAmount: number, delta?: number }
 *   paidAmount — new total paid amount (backward compatible)
 *   delta     — the amount entered by the admin (negative = refund)
 */
const updateInvoicePayment = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const { paidAmount, delta } = req.body;
    if (paidAmount === undefined || isNaN(Number(paidAmount))) {
        throw new AppError('Valid paidAmount is required', 400);
    }

    invoice.paidAmount = Number(paidAmount);

    const refundDelta = delta !== undefined ? Number(delta) : 0;

    // If delta < 0, this is a refund operation — status is always 'refunded'
    if (refundDelta < 0) {
        // Idempotency check: prevent duplicate refunds for the same invoice
        const existingRefund = await Payment.findOne({
            user: invoice.user,
            month: invoice.monthName,
            status: 'refunded',
        }).lean();
        if (existingRefund) {
            throw new AppError(`A refund for ${invoice.monthName} has already been processed`, 409);
        }

        invoice.status = 'refunded';

        // Detect the original payment type for this user/month so the refund
        // record matches the original payment flow (mess_bill or gas_bill).
        const originalPayment = await Payment.findOne({
            user: invoice.user,
            month: invoice.monthName,
            status: 'completed',
        }).sort({ paymentDate: -1 }).lean();
        const refundType = originalPayment?.type || 'mess_bill';

        // Persist a Payment record so the refund appears in both member
        // and admin payment history (Payments page / invoice history).
        const refundPayment = await Payment.create({
            user: invoice.user,
            amount: refundDelta,
            month: invoice.monthName,
            type: refundType,
            status: 'refunded',
            paymentMethod: 'cash',
            createdBy: req.user.id,
            remarks: `Refund of ₹ ${Math.abs(refundDelta).toLocaleString('en-IN', { maximumFractionDigits: 2 })} processed by admin`,
        });

        // Sync user payment/gasBill status for ALL refund types (not just gas_bill)
        const { syncUserPaymentStatus } = require('../../../services/payment.service');
        await syncUserPaymentStatus(invoice.user, refundType, 'refunded', invoice.monthName);

        // Fetch full user details for email (name + email required)
        const refundUser = await User.findById(invoice.user).select('name email').lean();

        // Send refund confirmation email (non-blocking — never blocks the response)
        if (refundUser?.email) {
            emailService.sendPaymentStatusEmail(
                refundUser.email,
                refundUser.name,
                { ...refundPayment.toObject?.() ?? refundPayment, month: invoice.monthName },
                'refunded'
            ).catch(err => logger.error('[Refund Email] Failed:', err.message));
        }

        // Notify user of refund (in-app notification)
        notificationService.createAndSend(
            invoice.user.toString(),
            'PAYMENT',
            'Payment Refunded',
            `A refund of ₹${Math.abs(refundDelta).toLocaleString('en-IN', { maximumFractionDigits: 2 })} for ${invoice.monthName} has been processed.`,
            { priority: 'HIGH', actionRequired: false }
        ).catch(() => {});

        // Broadcast billing:updated to all connected clients for real-time status refresh
        emitToAll('billing:updated');
    } else {
        invoice.status = invoiceService.determineInvoiceStatus(invoice.paidAmount, invoice.totalPayable);
    }

    await invoice.save();
    sendSuccessResponse(res, 200, 'Invoice payment updated', invoice);
});

/**
 * Helper: build a fully-annotated invoice + user pair ready for pdfService.
 * Runs independent DB queries in parallel to minimize latency.
 */
const _buildInvoiceForPdf = async (targetUserId, year, month) => {
    const monthName = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));

    // Parallel: fetch user, invoice (with payment data already attached),
    // and mess-wide stats — these are independent of each other.
    const [user, invoice, messStats] = await Promise.all([
        User.findById(targetUserId).lean(),
        invoiceService.getInvoice(targetUserId, month, year),
        invoiceService.calculateMessStats(month, year),
    ]);

    if (!user) throw new AppError('User not found', 404);
    if (!invoice) throw new AppError('Invoice not found', 404);

    // getInvoice() already attaches _paymentMethod/_transactionId/_paymentDate
    // for finalized and non-finalized paths. Only annotate mess-wide stats
    // which getInvoice() does not provide.
    invoice._messGrandTotalMarket = messStats.totalMarketAmount;
    invoice._messGrandTotalMeal = messStats.totalMealCount;

    // If getInvoice() didn't attach payment data (exempt path), fetch it.
    if (!invoice._paymentMethod) {
        const latestPayment = await Payment.findOne({
            user: targetUserId,
            month: monthName,
            status: 'completed',
            type: 'mess_bill',
        }).sort({ paymentDate: -1 }).lean();

        if (latestPayment) {
            invoice._paymentMethod = latestPayment.paymentMethod;
            invoice._transactionId = latestPayment.transactionId || null;
            invoice._paymentDate = latestPayment.paymentDate;
        }
    }

    return { invoice, user, monthName };
};

/**
 * GET /invoices/me/month/:year/:month/download
 * Server-side PDF generation — returns the PDF as a download.
 */
const downloadInvoicePDF = asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (!y || !m || m < 1 || m > 12) throw new AppError('Invalid year or month parameter', 400);

    let targetUserId = req.user.id;
    if (req.user.role === 'admin' && req.query.userId) {
        targetUserId = req.query.userId;
    }

    const { invoice, user, monthName } = await _buildInvoiceForPdf(targetUserId, y, m);
    const pdfBuffer = await pdfService.generateInvoicePDF(invoice, user);
    const fileName = `UnitedMess_Invoice_${monthName.replace(/\s+/g, '_')}.pdf`;

    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
});

/**
 * POST /invoices/me/month/:year/:month/email
 * Fire-and-forget: validates, responds 202 immediately, then generates
 * PDF + sends email in the background. Failure is logged server-side.
 */
const sendInvoiceEmailServer = asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (!y || !m || m < 1 || m > 12) throw new AppError('Invalid year or month parameter', 400);

    let targetUserId = req.user.id;
    if (req.user.role === 'admin' && req.query.userId) {
        targetUserId = req.query.userId;
    }

    // Validate user exists (fast) — fail fast before responding 202
    const user = await User.findById(targetUserId).select('name email').lean();
    if (!user) throw new AppError('User not found', 404);

    // Respond immediately — PDF generation + SMTP happen in background
    sendSuccessResponse(res, 202, `Invoice is being sent to ${user.email}`);

    // Fire-and-forget: no await, errors are logged not thrown
    const safeMonthName = new Intl.DateTimeFormat('en-US', {
        month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(Date.UTC(y, m - 1, 1)));

    _buildInvoiceForPdf(targetUserId, y, m)
        .then(({ invoice }) =>
            pdfService.generateInvoicePDF(invoice, user)
        )
        .then((pdfBuffer) => {
            const fileName = `UnitedMess_Invoice_${safeMonthName.replace(/\s+/g, '_')}.pdf`;
            return emailService.sendInvoiceEmail(user.email, user.name, safeMonthName, pdfBuffer, fileName);
        })
        .catch((err) => {
            logger.error('[Invoice Email] Background send failed', {
                userId: targetUserId,
                email: user.email,
                year: y,
                month: m,
                error: err.message,
            });
        });
});

/**
 * Admin: Send invoice summary email to all active approved members.
 * POST /invoices/admin/email-all
 * Body: { month, year }  (optional — defaults to current billing period)
 */
const emailAllInvoices = asyncHandler(async (req, res) => {
    const { month: bodyMonth, year: bodyYear } = req.body;
    let month = bodyMonth ? parseInt(bodyMonth, 10) : undefined;
    let year  = bodyYear  ? parseInt(bodyYear, 10)  : undefined;

    if (!month || !year) {
        const period = getBillingPeriod();
        month = period.month;
        year  = period.year;
    }

    if (month < 1 || month > 12) throw new AppError('Month must be between 1 and 12', 400);
    if (!year || year < 2000 || year > 2100) throw new AppError('Invalid year', 400);

    const result = await invoiceService.emailAllInvoices(month, year);
    sendSuccessResponse(res, 200, `Invoices sent: ${result.sent} succeeded, ${result.failed} failed`, result);
});

module.exports = {
    getActiveInvoice,
    getInvoiceHistory,
    getMonthlyInvoice,
    finalizeMonth,
    getInvoiceById,
    getAdminUnpaidInvoices,
    updateInvoicePayment,
    downloadInvoicePDF,
    sendInvoiceEmailServer,
    emailAllInvoices,
};
