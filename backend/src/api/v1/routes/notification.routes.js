const express = require('express');
const rateLimit = require('express-rate-limit');
const notificationController = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

// Push subscription
router.post('/subscribe', rateLimit({ windowMs: 60000, max: 10 }), notificationController.subscribeToPush);
router.delete('/subscribe', notificationController.unsubscribeFromPush);

// Read / mark
router.get('/', notificationController.getUserNotifications);
router.post('/read-all', notificationController.markAllAsRead);
router.post('/:notificationId/read', notificationController.ownershipCheck, notificationController.markAsRead);

// Admin
router.post(
    '/admin/custom',
    authorize('admin'),
    rateLimit({ windowMs: 3600000, max: 20 }),
    notificationController.sendCustomAdminNotification
);

// Push config (for VAPID key rotation)
router.get('/push-config', notificationController.getPushConfig);

module.exports = router;
