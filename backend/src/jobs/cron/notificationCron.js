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

    // Prune expired subscriptions daily at 3 AM
    cron.schedule('0 3 * * *', async () => {
        try {
            await notificationService.pruneExpiredSubscriptions();
        } catch (error) {
            logger.error(`[NotificationCron] Prune failed: ${error.message}`);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Kolkata',
    });

    logger.info('[NotificationCron] Push retry + subscription prune crons registered');
};

module.exports = { registerNotificationCron };
