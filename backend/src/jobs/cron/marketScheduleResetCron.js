/**
 * marketScheduleResetCron.js
 *
 * Month-end cleanup of manual market schedule selections.
 * At 23:59 IST on the last day of each month:
 *  - Soft-deletes (status:"reset") all active manual records for FUTURE months only.
 *  - Current month's selections are preserved until the month ends.
 *  - Round-robin (computed on-the-fly) is never affected.
 *  - History is preserved (no hard deletes).
 *
 * Schedule:  '59 23 * * *'  →  23:59 IST daily
 * Only acts on the last day of each month.
 */

'use strict';

const cron = require('node-cron');
const MarketSchedule = require('../../models/MarketSchedule.model');
const logger = require('../../utils/logger/index');

const resetFutureMonthSelections = async () => {
    const now = new Date();
    const utcDay = now.getUTCDate();
    const utcMonth = now.getUTCMonth() + 1;
    const utcYear = now.getUTCFullYear();

    const lastDayOfMonth = new Date(Date.UTC(utcYear, utcMonth, 0)).getUTCDate();
    if (utcDay !== lastDayOfMonth) return;

    const result = await MarketSchedule.updateMany(
        {
            status: 'active',
            $or: [
                { year: { $gt: utcYear } },
                { year: utcYear, month: { $gt: utcMonth } },
            ],
        },
        { $set: { status: 'reset' } }
    );

    if (result.modifiedCount > 0) {
        logger.info(
            `[MarketScheduleResetCron] Reset ${result.modifiedCount} future manual selection(s) for month-end reset`
        );
    }
};

const registerMarketScheduleResetCron = () => {
    cron.schedule('59 23 * * *', async () => {
        try {
            await resetFutureMonthSelections();
        } catch (error) {
            logger.error(`[MarketScheduleResetCron] Failed: ${error.message}`);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Kolkata',
    });

    logger.info('[MarketScheduleResetCron] Registered (23:59 IST daily, acts on last day of month)');
};

module.exports = { registerMarketScheduleResetCron };
