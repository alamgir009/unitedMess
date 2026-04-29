const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const { emitToUser, emitToAll } = require('../sockets');
const logger = require('../utils/logger/index');

/**
 * Create a new notification for a specific user and emit via socket.
 */
const createAndSend = async (userId, type, title, message) => {
    try {
        const notification = await Notification.create({
            recipient: userId,
            type,
            title,
            message
        });

        // Emit real-time event
        emitToUser(userId.toString(), 'receive_notification', notification);

        return notification;
    } catch (error) {
        logger.error(`Error creating notification: ${error.message}`);
    }
};

/**
 * Create and send a notification to all active users.
 */
const sendToAllActiveUsers = async (type, title, message) => {
    try {
        // We only want active users to receive this
        const activeUsers = await User.find({ isActive: true }).select('_id').lean();
        
        if (activeUsers.length === 0) return;

        const notificationsToInsert = activeUsers.map(user => ({
            recipient: user._id,
            type,
            title,
            message
        }));

        await Notification.insertMany(notificationsToInsert);

        // For global broadcast, we use emitToAll
        // But since emitToAll sends to all connected sockets, it's efficient.
        // The DB insertion handles persistence.
        emitToAll('receive_notification', {
            type,
            title,
            message,
            isRead: false,
            createdAt: new Date()
        });

        return { success: true, count: activeUsers.length };
    } catch (error) {
        logger.error(`Error broadcasting notification: ${error.message}`);
    }
};

/**
 * Create and send a notification to all admin users.
 */
const sendToAdmins = async (type, title, message) => {
    try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
        
        if (admins.length === 0) return;

        const notificationsToInsert = admins.map(admin => ({
            recipient: admin._id,
            type,
            title,
            message
        }));

        await Notification.insertMany(notificationsToInsert);

        admins.forEach(admin => {
            emitToUser(admin._id.toString(), 'receive_notification', {
                type,
                title,
                message,
                isRead: false,
                createdAt: new Date()
            });
        });
    } catch (error) {
        logger.error(`Error sending admin notification: ${error.message}`);
    }
};

/**
 * Fetch a user's notifications.
 */
const getUserNotifications = async (userId, options = { limit: 20, page: 1 }) => {
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
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Mark a specific notification as read.
 */
const markAsRead = async (userId, notificationId) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
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
        { isRead: true }
    );
    return result;
};

module.exports = {
    createAndSend,
    sendToAllActiveUsers,
    sendToAdmins,
    getUserNotifications,
    markAsRead,
    markAllAsRead
};
