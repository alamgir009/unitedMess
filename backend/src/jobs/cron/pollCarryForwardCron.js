/**
 * pollCarryForwardCron.js
 *
 * Daily carry-forward for meal poll votes.
 * At 00:05 IST each day, for every active user who has NOT voted today,
 * copies their most recent prior vote into today's record with
 * source = 'carried_forward' and writes an audit log entry.
 *
 * Schedule:  '5 0 * * *'  →  00:05 AM IST daily
 *
 * Design decisions:
 *  - 5-minute offset from midnight avoids race conditions with late-night
 *    vote submissions (scenario D10).
 *  - Idempotent: re-running skips users who already have a vote for today.
 *  - Errors are caught per-user — one failure never blocks others.
 *  - Follows the same pattern as invoiceCron.js.
 */

'use strict';

const cron = require('node-cron');
const mealService = require('../../services/meal.service');
const { normalizeDate } = require('../../utils/helpers/date.helper');
const logger = require('../../utils/logger/index');

/**
 * Compute today's date normalized to midnight UTC.
 * Uses the same UTC-normalization as the rest of the poll system.
 */
const getTodayUTC = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

/**
 * Main carry-forward job — runs daily at 00:05 IST.
 */
const runCarryForward = async () => {
    const today = getTodayUTC();
    const label = today.toISOString().slice(0, 10);

    logger.info(`[CarryForwardCron] ▶ Starting poll carry-forward for ${label}...`);

    try {
        const result = await mealService.carryForwardVotes(today);

        logger.info(
            `[CarryForwardCron] ✅ Complete for ${label} — ` +
            `created: ${result.created}, skipped: ${result.skipped}, ` +
            `errors: ${result.errors}, total users: ${result.total}`
        );
    } catch (err) {
        logger.error(`[CarryForwardCron] ❌ Carry-forward failed for ${label}: ${err.message}`, {
            stack: err.stack,
        });
    }
};

/**
 * Register the cron schedule.
 * Call this function once after the server starts.
 */
const registerPollCarryForwardCron = () => {
    // '5 0 * * *' → 00:05 AM IST every day
    cron.schedule('5 0 * * *', runCarryForward, {
        scheduled: true,
        timezone: 'Asia/Kolkata',
    });

    logger.info(
        '[CarryForwardCron] 📅 Poll carry-forward cron registered (daily at 00:05 IST).'
    );
};

module.exports = { registerPollCarryForwardCron, runCarryForward };
