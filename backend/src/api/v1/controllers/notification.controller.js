const crypto = require('crypto');
const notificationService = require('../../../services/notification.service');
const PushSubscription = require('../../../models/PushSubscription.model');
const User = require('../../../models/User.model');
const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const config = require('../../../config');
const logger = require('../../../utils/logger/index');

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

const subscribeToPush = asyncHandler(async (req, res) => {
    const { endpoint, keys, userAgent } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({
            success: false,
            message: 'Invalid subscription object: endpoint, keys.p256dh, and keys.auth are required',
        });
    }

    const existing = await PushSubscription.findOne({ endpoint });

    if (existing) {
        existing.userId = req.user.id;
        existing.keys = keys;
        existing.userAgent = userAgent || existing.userAgent;
        existing.lastUsed = new Date();
        existing.failureCount = 0;
        existing.isActive = true;
        await existing.save();
        return sendSuccessResponse(res, 200, 'Push subscription updated', existing);
    }

    const subscription = await PushSubscription.create({
        userId: req.user.id,
        endpoint,
        keys,
        userAgent: userAgent || '',
        lastUsed: new Date(),
    });

    sendSuccessResponse(res, 201, 'Push subscription created', subscription);
});

const unsubscribeFromPush = asyncHandler(async (req, res) => {
    const { endpoint } = req.body;

    if (endpoint) {
        await PushSubscription.findOneAndUpdate(
            { endpoint, userId: req.user.id },
            { isActive: false }
        );
    } else {
        await PushSubscription.updateMany(
            { userId: req.user.id },
            { isActive: false }
        );
    }

    sendSuccessResponse(res, 200, 'Push subscription(s) deactivated');
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
        const users = await User.find({ role: userId, isActive: true }).select('_id').lean();
        for (const user of users) {
            await notificationService.createAndSend(user._id.toString(), type || 'CUSTOM', title, message, options);
        }
        return sendSuccessResponse(res, 201, `Notification sent to ${users.length} users with role`);
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

const getPushConfig = asyncHandler(async (req, res) => {
    sendSuccessResponse(res, 200, 'Push config retrieved', {
        vapidPublicKey: config.vapid.publicKey || null,
    });
});

const ownershipCheck = asyncHandler(async (req, res, next) => {
    const { notificationId } = req.params;
    const Notification = require('../../../models/Notification.model');
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
    subscribeToPush,
    unsubscribeFromPush,
    sendCustomAdminNotification,
    getPushConfig,
    ownershipCheck,
};
