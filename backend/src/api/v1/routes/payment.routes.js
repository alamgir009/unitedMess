const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/')
    .get(paymentController.getPayments)
    .post(paymentController.createPayment);

router.post('/order', paymentController.createOnlineOrder);
router.post('/verify', paymentController.verifyPayment);

router.route('/:paymentId')
    .get(paymentController.getPayment)
    .patch(authorize('admin'), paymentController.updatePayment)
    .delete(authorize('admin'), paymentController.deletePayment);

module.exports = router;
