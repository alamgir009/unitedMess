const crypto = require('crypto');
const Notification = require('../models/Notification.model');
const PushSubscription = require('../models/PushSubscription.model');
const User = require('../models/User.model');
const { emitToUser, emitToAll } = require('../sockets');
const config = require('../config');
const logger = require('../utils/logger/index');
const fcmService = require('./fcm.service');

let webPush = null;
try {
    webPush = require('web-push');
    if (config.vapid?.publicKey && config.vapid?.privateKey) {
        webPush.setVapidDetails(
            config.vapid.subject || 'mailto:admin@unitedmess.uk',
            config.vapid.publicKey,
            config.vapid.privateKey
        );
    }
} catch (e) {
    logger.warn('web-push package not installed. Push notifications disabled.');
}

const BATCH_SIZE = 500;
const PUSH_RETRY_MAX = 3;
const PUSH_FAILURE_THRESHOLD = 3;

/**
 * Create a notification with idempotency check.
 */
const createNotification = async ({ userId, type, title, message, priority, actionRequired, actionUrl, metadata, idempotencyKey }) => {
    if (idempotencyKey) {
        const existing = await Notification.findOne({ idempotencyKey }).lean();
        if (existing) return existing;
    }

    const notification = await Notification.create({
        recipient: userId,
        type,
        title,
        message,
        priority: priority || 'NORMAL',
        actionRequired: actionRequired || false,
        actionUrl: actionUrl || null,
        metadata: metadata || null,
        deliveryStatus: 'PENDING',
        idempotencyKey: idempotencyKey || null,
        expiresAt: null,
    });

    return notification;
};

/**
 * Send real-time socket event to a specific user.
 */
const sendSocketEvent = (userId, notification) => {
    try {
        emitToUser(userId.toString(), 'receive_notification', notification);
    } catch (error) {
        logger.error(`Socket emit error for user ${userId}: ${error.message}`);
    }
};

/**
 * Send web push notification to all active subscriptions for a user.
 */
const sendWebPush = async (userId, notification) => {
    if (!webPush) return;

    try {
        const subscriptions = await PushSubscription.find({ userId, isActive: true }).lean();

        for (const sub of subscriptions) {
            const payload = JSON.stringify({
                title: notification.title,
                body: notification.message,
                icon: '/assets/icons/unitedmess-icon-1024.png',
                badge: '/assets/icons/unitedmess-icon-1024.png',
                data: {
                    url: notification.actionUrl || '/notifications',
                    notificationId: notification._id.toString(),
                },
                tag: notification._id.toString(),
                requireInteraction: notification.priority === 'CRITICAL' || notification.priority === 'HIGH',
            });

            await sendPushWithRetry(sub, payload);
        }
    } catch (error) {
        logger.error(`Web push error for user ${userId}: ${error.message}`);
    }
};

/**
 * Send a push with exponential backoff retry.
 */
const sendPushWithRetry = async (subscription, payload, attempt = 1) => {
    try {
        await webPush.sendNotification(subscription, payload);
        await PushSubscription.findByIdAndUpdate(subscription._id, { lastUsed: new Date(), failureCount: 0 });
    } catch (error) {
        if (error.statusCode === 410) {
            await PushSubscription.findByIdAndUpdate(subscription._id, { isActive: false });
            logger.info(`Push subscription ${subscription._id} deactivated (410 Gone)`);
            return;
        }

        if (error.statusCode === 429) {
            const retryAfter = parseInt(error.headers?.['retry-after'] || '5', 10) * 1000;
            await new Promise(resolve => setTimeout(resolve, retryAfter));
            if (attempt < PUSH_RETRY_MAX) {
                return sendPushWithRetry(subscription, payload, attempt + 1);
            }
        }

        if (attempt < PUSH_RETRY_MAX) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return sendPushWithRetry(subscription, payload, attempt + 1);
        }

        await handlePushFailure(subscription._id, error);
    }
};

/**
 * Handle a failed push attempt — increment failure count, deactivate at threshold.
 */
const handlePushFailure = async (subscriptionId, error) => {
    try {
        const sub = await PushSubscription.findById(subscriptionId);
        if (!sub) return;

        sub.failureCount = (sub.failureCount || 0) + 1;
        if (sub.failureCount >= PUSH_FAILURE_THRESHOLD) {
            sub.isActive = false;
            logger.info(`Push subscription ${subscriptionId} deactivated after ${sub.failureCount} failures`);
        }
        await sub.save();
    } catch (err) {
        logger.error(`Error handling push failure for ${subscriptionId}: ${err.message}`);
    }
};

/**
 * Create, save, and send a notification via socket + FCM (primary) + VAPID (fallback).
 */
const createAndSend = async (userId, type, title, message, options = {}) => {
    try {
        const notification = await createNotification({
            userId,
            type,
            title,
            message,
            priority: options.priority,
            actionRequired: options.actionRequired,
            actionUrl: options.actionUrl,
            metadata: options.metadata,
            idempotencyKey: options.idempotencyKey,
        });

        const notifObj = notification.toObject ? notification.toObject() : notification;

        sendSocketEvent(userId, notifObj);

        Notification.findByIdAndUpdate(notification._id, { deliveryStatus: 'SENT' }).catch(() => {});

        // Dual delivery: try FCM first, fall back to VAPID
        const fcmResult = await fcmService.sendToUser(userId, notifObj).catch(() => null);
        if (!fcmResult?.success) {
            sendWebPush(userId, notifObj).catch(err => {
                logger.error(`Web push background error: ${err.message}`);
            });
        }

        return notifObj;
    } catch (error) {
        logger.error(`Error creating notification: ${error.message}`);
    }
};

/**
 * Broadcast a notification to ALL active users with cursor-based batching.
 */
const broadcastToAll = async (type, title, message, options = {}) => {
    try {
        let lastId = null;
        let totalBatchCount = 0;
        let hasMore = true;

        while (hasMore) {
            const query = { isActive: true };
            if (lastId) query._id = { $gt: lastId };

            const batch = await User.find(query)
                .select('_id')
                .sort({ _id: 1 })
                .limit(BATCH_SIZE)
                .lean();

            if (batch.length === 0) {
                hasMore = false;
                break;
            }

            const notificationsToInsert = batch.map(user => ({
                recipient: user._id,
                type,
                title,
                message,
                priority: options.priority || 'NORMAL',
                actionRequired: options.actionRequired || false,
                deliveryStatus: 'SENT',
            }));

            try {
                const insertedDocs = await Notification.insertMany(notificationsToInsert, { ordered: false });
                totalBatchCount += insertedDocs.length;

                insertedDocs.forEach(notif => {
                    const notifObj = notif.toObject ? notif.toObject() : notif;
                    sendSocketEvent(notif.recipient.toString(), notifObj);
                });
            } catch (insertError) {
                logger.error(`Error inserting broadcast batch: ${insertError.message}`);
                
                const insertedDocs = insertError.insertedDocs || [];
                if (insertedDocs.length < notificationsToInsert.length) {
                    logger.warn(`Partial failure in broadcast batch: ${notificationsToInsert.length - insertedDocs.length} failed to insert.`);
                }
                
                totalBatchCount += insertedDocs.length;
                insertedDocs.forEach(notif => {
                    const notifObj = notif.toObject ? notif.toObject() : notif;
                    sendSocketEvent(notif.recipient.toString(), notifObj);
                });
            }

            lastId = batch[batch.length - 1]._id;
            if (batch.length < BATCH_SIZE) hasMore = false;
        }

        logger.info(`Broadcast notification sent to ${totalBatchCount} users`);
        return { success: true, count: totalBatchCount };
    } catch (error) {
        logger.error(`Error broadcasting notification: ${error.message}`);
        return { success: false, count: 0 };
    }
};

/**
 * Backward-compatible wrapper: send notification to ALL active users.
 * Delegates to broadcastToAll.
 */
const sendToAllActiveUsers = async (type, title, message) => {
    return broadcastToAll(type, title, message);
};

/**
 * Send notification to all admin users.
 */
const sendToAdmins = async (type, title, message, options = {}) => {
    try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
        if (admins.length === 0) return;

        const notificationsToInsert = admins.map(admin => ({
            recipient: admin._id,
            type,
            title,
            message,
            priority: options.priority || 'NORMAL',
            actionRequired: options.actionRequired || false,
            deliveryStatus: 'SENT',
        }));

        try {
            const insertedDocs = await Notification.insertMany(notificationsToInsert, { ordered: false });
            
            insertedDocs.forEach(notif => {
                const notifObj = notif.toObject ? notif.toObject() : notif;
                sendSocketEvent(notif.recipient.toString(), notifObj);
            });
        } catch (insertError) {
            logger.error(`Error inserting admin notifications: ${insertError.message}`);
            
            const insertedDocs = insertError.insertedDocs || [];
            if (insertedDocs.length < notificationsToInsert.length) {
                logger.warn(`Partial failure in admin broadcast: ${notificationsToInsert.length - insertedDocs.length} failed to insert.`);
            }
            
            insertedDocs.forEach(notif => {
                const notifObj = notif.toObject ? notif.toObject() : notif;
                sendSocketEvent(notif.recipient.toString(), notifObj);
            });
        }
    } catch (error) {
        logger.error(`Error sending admin notification: ${error.message}`);
    }
};

/**
 * Fetch a user's notifications with cursor-based pagination.
 */
const getUserNotifications = async (userId, options = { limit: 20, cursor: null }) => {
    const limit = parseInt(options.limit, 10) || 20;
    const page = parseInt(options.page, 10) || 1;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Notification.countDocuments({ recipient: userId });
    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return {
        notifications,
        unreadCount,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    };
};

/**
 * Mark a specific notification as read with timestamp.
 */
const markAsRead = async (userId, notificationId) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
    );
    return notification;
};

/**
 * Mark all user notifications as read.
 */
const markAllAsRead = async (userId) => {
    const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true, readAt: new Date() }
    );
    return result;
};

/**
 * Mark notification as delivered.
 */
const markDelivered = async (notificationId) => {
    return Notification.findByIdAndUpdate(notificationId, { deliveryStatus: 'DELIVERED' }, { new: true });
};

/**
 * Prune expired push subscriptions (inactive > 90 days).
 */
const pruneExpiredSubscriptions = async () => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await PushSubscription.deleteMany({
        isActive: false,
        lastUsed: { $lt: cutoff },
    });
    if (result.deletedCount > 0) {
        logger.info(`Pruned ${result.deletedCount} expired push subscriptions`);
    }
    return result;
};

/**
 * Retry PENDING notification deliveries.
 */
const retryPendingDeliveries = async () => {
    const cutoff = new Date(Date.now() - 2 * 60 * 1000);
    const pending = await Notification.find({
        deliveryStatus: 'PENDING',
        createdAt: { $lt: cutoff },
    }).limit(100).lean();

    for (const notif of pending) {
        sendSocketEvent(notif.recipient.toString(), notif);
        await Notification.findByIdAndUpdate(notif._id, { deliveryStatus: 'SENT' });
    }

    if (pending.length > 0) {
        logger.info(`Retried delivery for ${pending.length} pending notifications`);
    }
};

module.exports = {
    createAndSend,
    sendToAllActiveUsers,
    sendToAdmins,
    broadcastToAll,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    markDelivered,
    pruneExpiredSubscriptions,
    retryPendingDeliveries,
    sendSocketEvent,
    sendWebPush,
    createNotification,
};
