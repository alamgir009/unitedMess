const invoiceService = require('../../../services/invoice.service');
const penaltyService = require('../../../services/penalty.service');
const pdfService = require('../../../services/pdf.service');
const emailService = require('../../../services/email.service');
const paymentService = require('../../../services/payment.service');
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
const mongoose = require('mongoose');

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

    const targetUserId = _resolveTargetUserId(req);

    // Reuse the PDF pipeline's invoice+user assembly so the modal receives the
    // exact same data (payment attrs, mess-wide stats) the generated PDF uses.
    // The resolved user doc is the authoritative identity for the invoice owner —
    // critical when an admin previews another member's invoice (header must show
    // the member, not the viewer).
    const { invoice, user } = await invoiceService.buildInvoiceForPdf(targetUserId, y, m);

    // Attach a lean identity block (no sensitive fields) so the frontend preview
    // can render the invoice owner's name/email and per-guest charge correctly.
    invoice.userDetails = {
        id: String(user._id || user.id),
        name: user.name,
        email: user.email,
        image: user.image || null,
        chargePerGuestMeal: user.chargePerGuestMeal || null,
    };

    sendSuccessResponse(res, 200, 'Invoice retrieved', invoice);
});

/**
 * Admin: READ-ONLY exemption status for a member + billing period.
 * GET /invoices/admin/exemption?userId=<id>&month=<m>&year=<y>
 *
 * Never creates or mutates an Invoice — the admin must be able to browse
 * periods in the Edit Member panel without side effects. The PDF pipeline
 * (getMonthlyInvoice) is deliberately NOT reused here for that reason.
 */
const getInvoiceExemption = asyncHandler(async (req, res) => {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);

    if (!month || month < 1 || month > 12 || !year) {
        throw new AppError('Valid month (1-12) and year are required', 400);
    }

    const targetUserId = _resolveTargetUserId(req);
    const status = await invoiceService.getInvoiceExemptionStatus(targetUserId, month, year);

    sendSuccessResponse(res, 200, 'Exemption status retrieved', status);
});

/**
 * Admin: Finalize current month for all users
 */
const finalizeMonth = asyncHandler(async (req, res) => {
    const { month, year } = req.body;
    if (!month || !year) {
        throw new AppError('Month and year are required', 400);
    }
    const results = await invoiceService.finalizeMonth(month, year, req.user.id);
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

    // Attach the overdue-penalty breakdown (read-only for members — there is
    // no member write path for any penalty field, by construction).
    await penaltyService.annotatePenalties([invoice]);

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
    const invoiceId = req.params.id;
    const existing = await Invoice.findById(invoiceId);
    if (!existing) throw new AppError('Invoice not found', 404);

    const { paidAmount, delta } = req.body;
    if (paidAmount == null || !Number.isFinite(Number(paidAmount))) {
        throw new AppError('Valid paidAmount is required', 400);
    }
    const refundDelta = delta !== undefined ? Number(delta) : 0;
    if (!Number.isFinite(refundDelta)) throw new AppError('Valid delta is required', 400);

    const { invoice, payment } = await paymentService.withPaymentWrite([existing.user], async (session) => {
        const invoice = await Invoice.findById(invoiceId, null, { session });
        if (!invoice) throw new AppError('Invoice not found', 404);
        const originalPaidAmount = Number(invoice.paidAmount) || 0;
        const nextPaidAmount = Math.max(0, Number(paidAmount));
        let payment = null;

        if (refundDelta < 0) {
            const credit = invoiceService.computeRefundCredit({
                totalPayable: invoice.totalPayable,
                paidAmount: originalPaidAmount,
            });
            const recordedRows = await Payment.find({
                user: invoice.user,
                month: invoice.monthName,
                status: 'refunded',
            }, null, { session }).select('amount').lean();
            const remaining = credit - recordedRows.reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);
            const amount = Math.abs(refundDelta);
            if (remaining <= invoiceService.SETTLEMENT_TOLERANCE) {
                throw new AppError(`A refund for ${invoice.monthName} has already been processed`, 409);
            }
            if (amount > remaining + invoiceService.SETTLEMENT_TOLERANCE) {
                throw new AppError(
                    `Refund of ₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} exceeds the remaining refundable of ₹${Math.max(0, remaining).toLocaleString('en-IN', { maximumFractionDigits: 2 })} for ${invoice.monthName}`,
                    409,
                );
            }
            [payment] = await Payment.create([{
                user: invoice.user, amount, month: invoice.monthName, type: 'mess_bill', status: 'refunded',
                paymentMethod: 'cash', createdBy: req.user.id,
                remarks: `Refund of ₹ ${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} processed by admin`,
            }], { session });
            invoice.status = 'refunded';
        } else {
            if (invoice.isExempt === true && (invoice.totalPayable || 0) === 0) {
                throw new AppError(
                    `${invoice.monthName} is marked exempt (₹0 due). Clear the exemption before recording a payment.`, 409,
                );
            }
            if (refundDelta > 0 && Math.round(nextPaidAmount * 100) === Math.round(originalPaidAmount * 100)) {
                return { invoice, payment };
            }
            const amount = nextPaidAmount - originalPaidAmount;
            if (refundDelta > 0 && Math.round(amount * 100) !== Math.round(refundDelta * 100)) {
                throw new AppError('Invoice payments changed. Refresh the invoice and try again.', 409);
            }
            if (amount > 0) {
                const collected = refundDelta || amount;
                [payment] = await Payment.create([{
                    user: invoice.user, amount: collected, month: invoice.monthName, type: 'mess_bill', status: 'completed',
                    paymentMethod: 'cash', createdBy: req.user.id,
                    remarks: `Payment of ₹ ${collected.toLocaleString('en-IN', { maximumFractionDigits: 2 })} recorded by admin`,
                }], { session });
            }
            invoice.status = invoiceService.determineInvoiceStatus(nextPaidAmount, invoice.totalPayable);
        }
        invoice.paidAmount = nextPaidAmount;
        await invoice.save({ session });
        return { invoice, payment };
    });

    if (payment) {
        await paymentService.syncUserPaymentStatus(invoice.user, 'mess_bill', payment.status, invoice.monthName);
        const user = await User.findById(invoice.user).select('name email').lean();
        if (user?.email) {
            paymentService.sendPaymentConfirmationWithInvoice(
                user,
                { ...payment.toObject?.() ?? payment, month: invoice.monthName, user: invoice.user },
                payment.status,
            ).catch(err => logger.error('[Payment Confirmation Email] Failed:', err.message));
        }
    }

    if (payment?.status === 'refunded') {
        notificationService.createAndSend(
            invoice.user.toString(),
            'PAYMENT',
            'Payment Refunded',
            `A refund of ₹${Math.abs(refundDelta).toLocaleString('en-IN', { maximumFractionDigits: 2 })} for ${invoice.monthName} has been processed.`,
            { priority: 'HIGH', actionRequired: false }
        ).catch(() => {});

        emitToAll('billing:updated');
    }

    // Annotate settlement so the panel row flips state without a refetch:
    // credit fully recorded → informational "Refunded"; partial → remaining.
    const payload = invoice.toObject();
    await invoiceService.annotateRefundSettlement([payload]);

    sendSuccessResponse(res, 200, 'Invoice payment updated', payload);
});

/**
 * Admin: set / clear a member's billing exemption for one invoice.
 * PATCH /invoices/:id/exemption
 * Body: { override: 'none' | 'force_exempt' | 'force_bill', reason?: string }
 *
 * This is the ONLY endpoint in the system that changes exemption state.
 * All validation, guards and audit-trail writes live in
 * invoice.service.setInvoiceExemption().
 */
const updateInvoiceExemption = asyncHandler(async (req, res) => {
    const { override, reason } = req.body || {};

    if (typeof override !== 'string') {
        throw new AppError('override is required', 400);
    }

    const invoice = await invoiceService.setInvoiceExemption(req.params.id, {
        override,
        reason,
        adminId: req.user.id,
    });

    // Exemption changes every member's share of the mess cost pool —
    // broadcast so open dashboards recompute without a manual refresh.
    emitToAll('billing:updated');

    sendSuccessResponse(res, 200, 'Billing exemption updated', invoice);
});

/**
 * ── Admin: overdue-penalty controls ───────────────────────────────────────
 * All three are authorize('admin') at the ROUTER level (see invoice.routes).
 * Members never receive a write path for any penalty field — the guard is
 * server-side middleware, not UI hiding.
 */

/**
 * GET /invoices/admin/penalty-rate
 * Read the current global daily penalty rate (₹/day).
 */
const getPenaltyRate = asyncHandler(async (req, res) => {
    const dailyRate = await penaltyService.getGlobalDailyRate();
    sendSuccessResponse(res, 200, 'Penalty rate retrieved', { dailyRate });
});

/**
 * PUT /invoices/admin/penalty-rate
 * Update the GLOBAL daily penalty rate. Affects only NEWLY overdue bills —
 * existing snapshots (and per-bill overrides) are untouched.
 * Body: { dailyRate: number ≥ 0 }
 */
const updatePenaltyRate = asyncHandler(async (req, res) => {
    const { dailyRate } = req.body || {};
    const config = await penaltyService.updateGlobalRate(Number(dailyRate), req.user.id);
    sendSuccessResponse(res, 200, 'Penalty rate updated', config);
});

/**
 * PATCH /invoices/:id/penalty-rate
 * Admin: override the penalty rate on ONE bill (snapshots the new value).
 * Body: { dailyRate: number ≥ 0, reason?: string }
 */
const setInvoicePenaltyRate = asyncHandler(async (req, res) => {
    const { dailyRate, reason } = req.body || {};
    const invoice = await penaltyService.setPerBillRate(req.params.id, Number(dailyRate), {
        adminId: req.user.id,
        reason,
    });
    sendSuccessResponse(res, 200, 'Penalty rate overridden for this bill', invoice);
});

/**
 * PATCH /invoices/:id/penalty-waiver
 * Admin: waive or reverse (unwaive) a bill's accrued penalty.
 * Body: { action: 'waive' | 'unwaive', amount?: number, reason: string }
 * `amount` defaults to the FULL remaining accrual. Reason is mandatory.
 */
const updatePenaltyWaiver = asyncHandler(async (req, res) => {
    const { action, amount, reason } = req.body || {};

    if (action !== 'waive' && action !== 'unwaive') {
        throw new AppError("action must be 'waive' or 'unwaive'", 400);
    }
    if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) < 0)) {
        throw new AppError('amount must be a non-negative number', 400);
    }

    const invoice = action === 'waive'
        ? await penaltyService.waivePenalty(req.params.id, {
            amount: amount === undefined ? null : Number(amount),
            reason,
            adminId: req.user.id,
        })
        : await penaltyService.unwaivePenalty(req.params.id, { reason, adminId: req.user.id });

    sendSuccessResponse(res, 200,
        action === 'waive' ? 'Penalty waived' : 'Waiver reversed',
        invoice
    );
});

/**
 * Resolve the target user ID for invoice download/email endpoints.
 * Security guard: non-admin users can ONLY access their own invoice.
 * Admin users can access any user's invoice via ?userId= query param.
 * Validates userId is a valid MongoDB ObjectId when provided.
 */
const _resolveTargetUserId = (req) => {
    const requesterId = req.user.id;
    const isOwnerRequest = !req.query.userId || req.query.userId === requesterId;

    if (isOwnerRequest) {
        return requesterId;
    }

    // A different userId was requested — admin-only
    if (req.user.role !== 'admin') {
        throw new AppError('You are not authorized to access another user\'s invoice', 403);
    }

    const requestedUserId = req.query.userId;
    if (!mongoose.Types.ObjectId.isValid(requestedUserId)) {
        throw new AppError('Invalid userId parameter', 400);
    }

    return requestedUserId;
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

    const targetUserId = _resolveTargetUserId(req);

    const { invoice, user, monthName } = await invoiceService.buildInvoiceForPdf(targetUserId, y, m);
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

    const targetUserId = _resolveTargetUserId(req);

    // Validate user exists (fast) — fail fast before responding 202
    const user = await User.findById(targetUserId).select('name email').lean();
    if (!user) throw new AppError('User not found', 404);

    // Respond immediately — PDF generation + SMTP happen in background
    sendSuccessResponse(res, 202, `Invoice is being sent to ${user.email}`);

    // Fire-and-forget: no await, errors are logged not thrown
    const safeMonthName = new Intl.DateTimeFormat('en-US', {
        month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(Date.UTC(y, m - 1, 1)));

    invoiceService.buildInvoiceForPdf(targetUserId, y, m)
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
    getInvoiceExemption,
    updateInvoicePayment,
    updateInvoiceExemption,
    getPenaltyRate,
    updatePenaltyRate,
    setInvoicePenaltyRate,
    updatePenaltyWaiver,
    downloadInvoicePDF,
    sendInvoiceEmailServer,
    emailAllInvoices,
};
