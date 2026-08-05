/**
 * autoCreateMealsCron.js
 *
 * Daily auto-creation of Meal records from vote standing preferences.
 * At 00:10 IST each day (5 minutes after carry-forward):
 *  - For each active user, resolves their effective vote for today.
 *  - Creates or updates a Meal record matching the vote type.
 *  - Skips users who already have a correct meal record (idempotent).
 *
 * Schedule:  '10 0 * * *'  →  00:10 AM IST daily
 *
 * Design decisions:
 *  - Runs AFTER carry-forward (00:05 IST) to ensure all users have effective votes.
 *  - 5-minute offset from carry-forward avoids race conditions.
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
 * Uses the same UTC-normalization as the rest of the meal system.
 */
const getTodayUTC = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

/**
 * Main auto-create meals job — runs daily at 00:10 IST.
 */
const runAutoCreateMeals = async () => {
    const today = getTodayUTC();
    const label = today.toISOString().slice(0, 10);

    logger.info(`[AutoCreateMealsCron] ▶ Starting auto-create meals for ${label}...`);

    try {
        const result = await mealService.autoCreateMealsFromVotes(today);

        logger.info(
            `[AutoCreateMealsCron] ✅ Complete for ${label} — ` +
            `created: ${result.created}, updated: ${result.updated}, ` +
            `skipped: ${result.skipped}, errors: ${result.errors}, ` +
            `total users: ${result.total}`
        );
    } catch (err) {
        logger.error(`[AutoCreateMealsCron] ❌ Auto-create meals failed for ${label}: ${err.message}`, {
            stack: err.stack,
        });
    }
};

/**
 * Register the cron schedule.
 * Call this function once after the server starts.
 */
const registerAutoCreateMealsCron = () => {
    // '10 0 * * *' → 00:10 AM IST every day
    cron.schedule('10 0 * * *', runAutoCreateMeals, {
        scheduled: true,
        timezone: 'Asia/Kolkata',
    });

    logger.info(
        '[AutoCreateMealsCron] 📅 Auto-create meals cron registered (daily at 00:10 IST).'
    );
};

module.exports = { registerAutoCreateMealsCron, runAutoCreateMeals };
