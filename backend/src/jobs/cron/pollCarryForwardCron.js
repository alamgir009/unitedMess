/**
 * pollCarryForwardCron.js
 *
 * Daily carry-forward for meal poll standing preferences.
 * At 00:05 IST each day:
 *  - For each active user who has NEVER voted, creates a default 'off'
 *    standing preference so they appear in poll status.
 *  - For deactivated users, closes their standing preference.
 *
 * With the standing-preference model, carry-forward is implicit —
 * a user's vote applies to all future dates until they change it.
 * This cron only handles bootstrap and deactivation edge cases.
 *
 * Schedule:  '5 0 * * *'  →  00:05 AM IST daily
 *
 * Design decisions:
 *  - 5-minute offset from midnight avoids race conditions with late-night
 *    vote submissions.
 *  - Idempotent: re-running is safe.
 *  - Errors are caught per-user — one failure never blocks others.
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
            `created: ${result.created}, closed: ${result.closed}, ` +
            `skipped: ${result.skipped}, errors: ${result.errors}, ` +
            `total users: ${result.total}`
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
