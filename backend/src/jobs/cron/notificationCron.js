const cron = require('node-cron');
const notificationService = require('../../services/notification.service');
const logger = require('../../utils/logger/index');

const registerNotificationCron = () => {
    // Retry pending deliveries every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        try {
            await notificationService.retryPendingDeliveries();
        } catch (error) {
            logger.error(`[NotificationCron] Retry failed: ${error.message}`);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Kolkata',
    });

    logger.info('[NotificationCron] Push retry cron registered (VAPID prune removed)');
};

module.exports = { registerNotificationCron };
