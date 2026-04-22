const express = require('express');
const invoiceController = require('../controllers/invoice.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// ── User routes ─────────────────────────────────────
// Active invoice based on 10th-day rule
router.get('/me/active', invoiceController.getActiveInvoice);

// Full invoice history for current user
router.get('/me/history', invoiceController.getInvoiceHistory);

// Specific month invoice — used by "View Invoice" button in payment history
// Admin can pass ?userId=<id> query param
router.get('/me/month/:year/:month', invoiceController.getMonthlyInvoice);

// Get by ID (owner or admin)
router.get('/:id', invoiceController.getInvoiceById);

// ── Admin routes ─────────────────────────────────────
router.post('/finalize', authorize('admin'), invoiceController.finalizeMonth);

// Admin: view all finalized unpaid/partially-paid invoices for a given month
router.get('/admin/unpaid', authorize('admin'), invoiceController.getAdminUnpaidInvoices);

// Admin: update a specific invoice's payment (mark paid / partial)
router.patch('/:id/payment', authorize('admin'), invoiceController.updateInvoicePayment);

module.exports = router;
