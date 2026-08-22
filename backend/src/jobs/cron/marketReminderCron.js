const cron = require('node-cron');
const MarketSchedule = require('../../models/MarketSchedule.model');
const User = require('../../models/User.model');
const notificationService = require('../../services/notification.service');
const { normalizeToUTC } = require('../../utils/helpers/date.helper');
const { toMonthKey } = require('../../services/marketSchedule.service');
const logger = require('../../utils/logger/index');

const sendMarketReminders = async () => {
    const now = new Date();

    const todayUTC = normalizeToUTC(now);
    const tomorrowUTC = normalizeToUTC(new Date(now.getTime() + 24 * 60 * 60 * 1000));

    const todayMonthKey = toMonthKey(
        todayUTC.getUTCFullYear(),
        todayUTC.getUTCMonth() + 1
    );
    const tomorrowMonthKey = toMonthKey(
        tomorrowUTC.getUTCFullYear(),
        tomorrowUTC.getUTCMonth() + 1
    );

    const todaySchedule = await MarketSchedule.find({
        date: todayUTC,
        monthKey: todayMonthKey,
        status: 'active',
    })
        .populate('user', 'name')
        .lean();

    for (const schedule of todaySchedule) {
        if (!schedule.user) continue;
        try {
            await notificationService.createAndSend(
                schedule.user._id,
                'SYSTEM',
                'Market Duty Today',
                `You have market duty today. Please ensure all market tasks are completed.`,
                {
                    priority: 'HIGH',
                    actionUrl: '/events?view=markets',
                    metadata: {
                        type: 'market_reminder_today',
                        date: todayUTC.toISOString(),
                    },
                    idempotencyKey: `market_today_${schedule.user._id}_${todayUTC.toISOString().split('T')[0]}`,
                }
            );
        } catch (err) {
            logger.error(`Failed to send today market reminder to ${schedule.user._id}: ${err.message}`);
        }
    }

    const tomorrowSchedule = await MarketSchedule.find({
        date: tomorrowUTC,
        monthKey: tomorrowMonthKey,
        status: 'active',
    })
        .populate('user', 'name')
        .lean();

    for (const schedule of tomorrowSchedule) {
        if (!schedule.user) continue;
        try {
            await notificationService.createAndSend(
                schedule.user._id,
                'SYSTEM',
                'Market Duty Tomorrow',
                `You have market duty tomorrow. Please prepare accordingly.`,
                {
                    priority: 'NORMAL',
                    actionUrl: '/events?view=markets',
                    metadata: {
                        type: 'market_reminder_tomorrow',
                        date: tomorrowUTC.toISOString(),
                    },
                    idempotencyKey: `market_tomorrow_${schedule.user._id}_${tomorrowUTC.toISOString().split('T')[0]}`,
                }
            );
        } catch (err) {
            logger.error(`Failed to send tomorrow market reminder to ${schedule.user._id}: ${err.message}`);
        }
    }

    logger.info(`[MarketReminderCron] Sent reminders: ${todaySchedule.length} today, ${tomorrowSchedule.length} tomorrow`);
};

const registerMarketReminderCron = () => {
    cron.schedule('0 20 * * *', async () => {
        try {
            await sendMarketReminders();
        } catch (error) {
            logger.error(`[MarketReminderCron] Failed: ${error.message}`);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Kolkata',
    });

    logger.info('[MarketReminderCron] Market reminder cron registered (daily 8 PM IST)');
};

module.exports = { registerMarketReminderCron };
