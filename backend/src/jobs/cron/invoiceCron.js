/**
 * invoiceCron.js
 *
 * Automatically finalizes the previous month's invoices for all active users
 * on the 11th of every month at 00:01 AM IST, then resets every user's
 * billing-cycle fields (meal counters, market total, payment status, gas bill
 * status) so the Members page correctly reflects the new billing period.
 *
 * Schedule:  '1 0 11 * *'
 *   - minute 1, hour 0, day-of-month 11, every month
 *
 * Design decisions:
 *  - 1-minute offset from midnight avoids race conditions with any
 *    midnight-boundary date logic (e.g. the 10th-day rule in getActiveInvoice).
 *  - Errors are caught and logged — a cron failure must never crash the server.
 *  - Idempotent: re-running on the same day skips already-finalized invoices
 *    (isFinalized guard in the service layer) but safely re-applies the reset.
 */

'use strict';

const cron = require('node-cron');
const invoiceService = require('../../services/invoice.service');
const logger = require('../../utils/logger/index');

/**
 * Returns the 1-indexed previous calendar month and the correct year.
 * E.g., called on May 11 → { month: 4, year: 2026 }
 *       called on Jan 11 → { month: 12, year: 2025 }
 */
const getPrevMonthYear = () => {
    const now = new Date();
    const currentMonth1Idx = now.getMonth() + 1; // 1-indexed
    const year = now.getFullYear();

    if (currentMonth1Idx === 1) {
        return { month: 12, year: year - 1 };
    }
    return { month: currentMonth1Idx - 1, year };
};

/**
 * Main finalization job — runs on 11th of each month at 00:01 IST.
 *
 * Steps:
 *  1. Finalize all active users' invoices for the PREVIOUS month.
 *  2. Reset every user's billing-cycle counters AND payment / gas-bill
 *     statuses to 'pending' for the NEW billing period, via a single
 *     atomic MongoDB bulkWrite (O(1) round-trip).
 */
const runInvoiceFinalization = async () => {
    const { month, year } = getPrevMonthYear();
    const label = `${year}-${String(month).padStart(2, '0')}`;

    logger.info(`[InvoiceCron] ▶ Starting billing-cycle rollover for ${label}...`);

    try {
        // ── Step 1: Finalize previous month invoices ──────────────────────────
        const results = await invoiceService.finalizeMonth(month, year);
        logger.info(`[InvoiceCron] ✅ Finalized ${results.length} invoice(s) for ${label}.`);

        // ── Step 2: Reset billing-cycle fields for ALL active users ───────────
        //   Resets: totalMeal, guestMeal, totalMarketAmount → current-month data
        //           payment, gasBill                        → 'pending'
        logger.info(`[InvoiceCron] ⟳  Resetting billing-cycle fields (counters + payment/gasBill status)...`);

        const { modifiedCount, matchedCount } = await invoiceService.resetUserStatsAfterFinalization();

        logger.info(
            `[InvoiceCron] ✅ Billing reset complete — ` +
            `matched: ${matchedCount}, modified: ${modifiedCount} user(s). ` +
            `payment & gasBill reset to 'pending' for new cycle.`
        );

    } catch (err) {
        // Never crash the server — log full stack for post-mortem analysis
        logger.error(`[InvoiceCron] ❌ Rollover failed for ${label}: ${err.message}`, { stack: err.stack });
    }
};

/**
 * Register the cron schedule.
 * Call this function once after the server starts.
 */
const registerInvoiceCron = () => {
    // '1 0 11 * *'  →  00:01 AM on the 11th of every month
    cron.schedule('1 0 11 * *', runInvoiceFinalization, {
        scheduled: true,
        timezone: 'Asia/Kolkata', // IST — adjust to your server timezone if needed
    });

    logger.info('[InvoiceCron] 📅 Invoice auto-finalization + billing-cycle reset cron registered (11th of each month at 00:01 IST).');
};

/**
 * Register the reminder cron schedule.
 */
const registerReminderCron = () => {
    // 0 10 30 * * => 10:00 AM on the 30th of every month
    cron.schedule('0 10 30 * *', async () => {
        try {
            const notificationService = require('../../services/notification.service');
            await notificationService.sendToAllActiveUsers(
                'SYSTEM',
                'End of Month Reminder',
                'Please update your account and complete your payment before the 10th of the next month. Otherwise, your invoice will be reset.'
            );
            logger.info('[ReminderCron] End of month reminder sent to all users.');
        } catch (error) {
            logger.error(`[ReminderCron] ❌ Failed to send reminder: ${error.message}`);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Kolkata', // IST
    });

    logger.info('[ReminderCron] 📅 Reminder cron registered (30th of each month at 10:00 AM IST).');
};

module.exports = { registerInvoiceCron, runInvoiceFinalization, registerReminderCron };
