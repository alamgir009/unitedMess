/**
 * marketScheduleResetCron.js
 *
 * Month-end cleanup of manual market schedule selections.
 *
 * Two crons ensure complete reset:
 *
 * 1. Primary — '59 23 * * *' (23:59 IST daily, last day of month only)
 *    Soft-deletes (status:"reset") all active manual records for the
 *    CURRENT month only. This ensures each month starts with a clean slate
 *    without destroying schedules for future months.
 *
 * 2. Safety-net — '5 0 * * *' (00:05 IST daily, 1st of month only)
 *    Resets any active records from the PREVIOUS month only. Catches
 *    records missed if the server was down at 23:59.
 *
 * History is preserved (no hard deletes). Google Calendar events for
 * reset records are cleaned up asynchronously.
 */

'use strict';

const cron = require('node-cron');
const MarketSchedule = require('../../models/MarketSchedule.model');
const logger = require('../../utils/logger/index');

/**
 * Reset active records for a specific year/month and clean up
 * any associated Google Calendar events.
 *
 * @param {object} filter - MongoDB query filter (must include year, month, status)
 * @param {string} label - Human-readable label for logging
 */
const resetRecords = async (filter, label) => {
    const recordsToReset = await MarketSchedule.find(filter)
        .select('_id googleCalendarEventId user')
        .lean();

    if (recordsToReset.length === 0) return;

    const ids = recordsToReset.map((r) => r._id);

    await MarketSchedule.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'reset' } }
    );

    // Clean up Google Calendar events (fire-and-forget)
    const googleCalendarService = require('../../services/googleCalendar.service');
    for (const record of recordsToReset) {
        if (record.googleCalendarEventId) {
            googleCalendarService
                .removeEventFromCalendar(record.user, record.googleCalendarEventId)
                .catch((err) =>
                    logger.error(`[MarketScheduleResetCron] GC cleanup failed for ${record._id}: ${err.message}`)
                );
        }
    }

    logger.info(
        `[MarketScheduleResetCron] ${label}: Reset ${ids.length} active selection(s)`
    );
};

/**
 * Primary reset — runs at 23:59 IST on the last day of each month.
 * Resets CURRENT month only (not future months).
 *
 * This ensures users start each month with a clean slate for that month
 * while preserving any schedules they've already created for future months.
 */
const resetMonthEnd = async () => {
    const now = new Date();
    const utcDay = now.getUTCDate();
    const utcMonth = now.getUTCMonth() + 1;
    const utcYear = now.getUTCFullYear();

    const lastDayOfMonth = new Date(Date.UTC(utcYear, utcMonth, 0)).getUTCDate();
    if (utcDay !== lastDayOfMonth) return;

    const query = { status: 'active', year: utcYear, month: utcMonth };
    await resetRecords(query, 'Month-end');
};

/**
 * Safety-net reset — runs at 00:05 IST on the 1st of each month.
 * Resets PREVIOUS month only (catches any records missed by the 23:59
 * cron due to server downtime).
 *
 * Does NOT reset the current month or future months, preserving user
 * schedules that were created after the month-end reset.
 */
const resetFirstOfMonth = async () => {
    const now = new Date();
    const utcDay = now.getUTCDate();
    if (utcDay !== 1) return;

    let utcMonth = now.getUTCMonth() + 1;
    let utcYear = now.getUTCFullYear();

    // Go back to the previous month
    utcMonth -= 1;
    if (utcMonth === 0) {
        utcMonth = 12;
        utcYear -= 1;
    }

    const query = { status: 'active', year: utcYear, month: utcMonth };
    await resetRecords(query, '1st-of-month safety-net');
};

const registerMarketScheduleResetCron = () => {
    // Primary: 23:59 IST daily (acts on last day of month)
    cron.schedule('59 23 * * *', async () => {
        try {
            await resetMonthEnd();
        } catch (error) {
            logger.error(`[MarketScheduleResetCron] Month-end reset failed: ${error.message}`);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Kolkata',
    });

    // Safety-net: 00:05 IST daily (acts on 1st of month)
    cron.schedule('5 0 * * *', async () => {
        try {
            await resetFirstOfMonth();
        } catch (error) {
            logger.error(`[MarketScheduleResetCron] 1st-of-month reset failed: ${error.message}`);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Kolkata',
    });

    logger.info(
        '[MarketScheduleResetCron] Registered (month-end 23:59 IST + safety-net 00:05 IST)'
    );
};

module.exports = { registerMarketScheduleResetCron, resetMonthEnd, resetFirstOfMonth };
