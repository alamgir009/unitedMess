const express = require('express');
const rateLimit = require('express-rate-limit');
const notificationController = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

// FCM-only push delivery — VAPID web-push subscribe/unsubscribe routes removed.

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

// FCM token management
router.post('/fcm-token', notificationController.registerFcmToken);
router.delete('/fcm-token', notificationController.unregisterFcmToken);

// Delivery receipt (beacon from service worker)
router.post('/delivery-receipt', notificationController.deliveryReceipt);

// Notification preferences
router.get('/preferences', notificationController.getNotificationPreferences);
router.patch('/preferences', notificationController.updateNotificationPreferences);

module.exports = router;
