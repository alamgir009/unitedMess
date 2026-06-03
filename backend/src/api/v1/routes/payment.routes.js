const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { uploadQrCode } = require('../middlewares/upload.middleware');

const authenticated = [protect];
const adminOnly    = [protect, authorize('admin')];

// UPI & Month endpoints (Specific routes first)
router.get('/payable-months', ...authenticated, paymentController.getPayableMonths);
router.route('/upi-config')
    .get(...authenticated, paymentController.getUpiConfig)
    .put(...adminOnly,     paymentController.updateUpiConfig);
router.post('/upi-config/qrcode', ...adminOnly, uploadQrCode.single('qrcode'), paymentController.uploadQrCode);

router.post('/upi-manual', ...authenticated, paymentController.submitUpiManualPayment);
router.patch('/upi-manual/:paymentId/verify', ...adminOnly, paymentController.verifyUpiManualPayment);

// Diagnostic endpoint — returns current Razorpay key mode (live/test)
router.get('/razorpay-status', ...adminOnly, paymentController.getRazorpayStatus);

// All routes require authentication
router.route('/')
    .get(...authenticated, paymentController.getPayments)
    .post(...authenticated, paymentController.createPayment);

router.post('/order',     ...authenticated, paymentController.createOnlineOrder);
router.post('/verify',    ...authenticated, paymentController.verifyPayment);
router.post('/bulk',      ...adminOnly,     paymentController.createBulkPayments);

router.route('/:paymentId')
    .get(   ...authenticated, paymentController.getPayment)
    .patch( ...adminOnly,     paymentController.updatePayment)
    .delete(...adminOnly,     paymentController.deletePayment);

module.exports = router;