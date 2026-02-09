const express = require('express');
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Current User Routes
router.use(protect);
router.get('/me', userController.getUser);
router.patch('/me', userController.updateUser);

// Admin Routes
router.route('/')
    .get(authorize('admin'), userController.getUsers)
    .post(authorize('admin'), userController.createUser);

router.get('/stats', authorize('admin'), userController.getStats);

router.post('/:userId/approve', authorize('admin'), userController.approveUser);
router.post('/:userId/deny', authorize('admin'), userController.denyUser);
router.patch('/:userId/payment', authorize('admin'), userController.updatePaymentStatus);

router.route('/:userId')
    .get(authorize('admin'), userController.getUser)
    .patch(authorize('admin'), userController.updateUser)
    .delete(authorize('admin'), userController.deleteUser);

module.exports = router;
