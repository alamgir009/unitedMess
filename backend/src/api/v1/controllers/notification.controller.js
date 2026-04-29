const notificationService = require('../../../services/notification.service');
const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');

const getUserNotifications = asyncHandler(async (req, res) => {
    const { limit, page } = req.query;
    const result = await notificationService.getUserNotifications(req.user.id, { limit, page });
    sendSuccessResponse(res, 200, 'Notifications retrieved successfully', result);
});

const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const notification = await notificationService.markAsRead(req.user.id, notificationId);
    sendSuccessResponse(res, 200, 'Notification marked as read', notification);
});

const markAllAsRead = asyncHandler(async (req, res) => {
    const result = await notificationService.markAllAsRead(req.user.id);
    sendSuccessResponse(res, 200, 'All notifications marked as read', result);
});

module.exports = {
    getUserNotifications,
    markAsRead,
    markAllAsRead
};
