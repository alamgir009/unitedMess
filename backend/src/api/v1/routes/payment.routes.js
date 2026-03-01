const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const authenticated = [protect];
const adminOnly    = [protect, authorize('admin')];

// All routes require authentication
router.route('/')
    .get(...authenticated, paymentController.getPayments)
    .post(...authenticated, paymentController.createPayment);

router.post('/order',  ...authenticated, paymentController.createOnlineOrder);
router.post('/verify', ...authenticated, paymentController.verifyPayment);

router.route('/:paymentId')
    .get(   ...authenticated, paymentController.getPayment)
    .patch( ...adminOnly,     paymentController.updatePayment)
    .delete(...adminOnly,     paymentController.deletePayment);

module.exports = router;