const crypto = require('crypto');
const notificationService = require('../../../services/notification.service');
const Notification = require('../../../models/Notification.model');
const User = require('../../../models/User.model');
const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const pick = require('../../../utils/helpers/pick');
const logger = require('../../../utils/logger/index');
const fcmController = require('./fcm.controller');

const getUserNotifications = asyncHandler(async (req, res) => {
    const { limit, page } = req.query;
    const result = await notificationService.getUserNotifications(req.user.id, { limit, page });
    sendSuccessResponse(res, 200, 'Notifications retrieved successfully', result);
});

const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const notification = await notificationService.markAsRead(req.user.id, notificationId);
    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    sendSuccessResponse(res, 200, 'Notification marked as read', notification);
});

const markAllAsRead = asyncHandler(async (req, res) => {
    const result = await notificationService.markAllAsRead(req.user.id);
    sendSuccessResponse(res, 200, 'All notifications marked as read', result);
});



const sendCustomAdminNotification = asyncHandler(async (req, res) => {
    const { targetType, userId, title, message, type, priority, actionRequired, actionUrl } = req.body;

    const idempotencyKey = crypto
        .createHash('sha256')
        .update(`${req.user.id}:${Date.now()}:${JSON.stringify({ title, message })}`)
        .digest('hex')
        .slice(0, 32);

    const options = { priority, actionRequired, actionUrl, idempotencyKey };

    if (targetType === 'USER') {
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required when targetType is USER',
            });
        }

        await notificationService.createAndSend(userId, type || 'CUSTOM', title, message, options);
        return sendSuccessResponse(res, 201, 'Notification sent to user');
    }

    if (targetType === 'ROLE') {
        const roleName = userId;
        if (!roleName || !['admin', 'user'].includes(roleName)) {
            return res.status(400).json({
                success: false,
                message: 'userId must be a valid role name (admin or user) when targetType is ROLE',
            });
        }
        const users = await User.find({ role: roleName, isActive: true }).select('_id').lean();
        for (const user of users) {
            await notificationService.createAndSend(user._id.toString(), type || 'CUSTOM', title, message, options);
        }
        return sendSuccessResponse(res, 201, `Notification sent to ${users.length} users with role: ${roleName}`);
    }

    if (targetType === 'ALL') {
        setImmediate(async () => {
            try {
                await notificationService.broadcastToAll(type || 'CUSTOM', title, message, options);
            } catch (err) {
                logger.error(`Background broadcast failed: ${err.message}`);
            }
        });

        const estimatedRecipients = await User.countDocuments({ isActive: true });
        return sendSuccessResponse(res, 202, `Broadcast queued for approximately ${estimatedRecipients} users`);
    }

    return res.status(400).json({ success: false, message: 'Invalid targetType. Use ALL, USER, or ROLE' });
});



const deliveryReceipt = asyncHandler(async (req, res) => {
    const { notificationId, event, timestamp } = req.body;
    if (notificationId && notificationId !== 'default') {
        Notification.findByIdAndUpdate(notificationId, {
            deliveryStatus: event === 'received' ? 'DELIVERED' : 'SENT',
            $push: { 'metadata.deliveryEvents': { event, timestamp, userAgent: req.headers['user-agent'] } },
        }).catch(() => {});
    }
    res.status(204).send();
});

const getNotificationPreferences = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('notificationPreferences').lean();
    sendSuccessResponse(res, 200, 'Preferences retrieved', user?.notificationPreferences || {});
});

const updateNotificationPreferences = asyncHandler(async (req, res) => {
    const allowed = pick(req.body, ['push', 'email', 'sms', 'types', 'quietHours']);
    const user = await User.findByIdAndUpdate(
        req.user.id,
        { notificationPreferences: allowed },
        { new: true, select: 'notificationPreferences' }
    );
    sendSuccessResponse(res, 200, 'Preferences updated', user.notificationPreferences);
});

const ownershipCheck = asyncHandler(async (req, res, next) => {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId).select('recipient').lean();
    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    if (notification.recipient.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
});

module.exports = {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    sendCustomAdminNotification,
    deliveryReceipt,
    getNotificationPreferences,
    updateNotificationPreferences,
    ownershipCheck,
    registerFcmToken: fcmController.registerFcmToken,
    unregisterFcmToken: fcmController.unregisterFcmToken,
};
