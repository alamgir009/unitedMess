const MarketSchedule = require('../models/MarketSchedule.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const { parseDate, normalizeToUTC, toDateKey } = require('../utils/helpers/date.helper');
const { validateMarketSchedule } = require('../utils/validators/marketSchedule.validator');
const { generateMarketDutyICS } = require('../utils/ics');
const emailService = require('./email.service');
const notificationService = require('./notification.service');
const googleCalendarService = require('./googleCalendar.service');
const logger = require('../utils/logger/index');

const MAX_DATES_PER_MONTH = 3;

/**
 * Derive monthKey string from year/month (e.g., "2026-08").
 */
const toMonthKey = (year, month) => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    return `${y}-${String(m).padStart(2, '0')}`;
};

/**
 * Get all scheduled dates for a month (user/admin selected only).
 */
const getMonthSchedule = async (year, month) => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        throw new AppError('Invalid year or month', 400);
    }

    const monthKey = toMonthKey(y, m);

    const schedules = await MarketSchedule.find({
        monthKey,
        status: 'active',
    })
        .populate('user', 'name email image')
        .sort({ date: 1 })
        .lean();

    return schedules;
};

/**
 * Get available (untaken) dates for a month.
 * Only considers active DB records (manual/admin selections).
 */
const getAvailableDates = async (year, month) => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        throw new AppError('Invalid year or month', 400);
    }

    const monthKey = toMonthKey(y, m);

    const takenSchedules = await MarketSchedule.find({
        monthKey,
        status: 'active',
    })
        .select('date user')
        .populate('user', 'name image')
        .lean();

    const takenDateMap = {};
    for (const s of takenSchedules) {
        const dateKey = toDateKey(normalizeToUTC(s.date));
        takenDateMap[dateKey] = s;
    }

    const daysInMonth = new Date(y, m, 0).getDate();
    const available = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = normalizeToUTC(new Date(Date.UTC(y, m - 1, d)));
        const dateKey = toDateKey(dateObj);

        if (takenDateMap[dateKey]) {
            available.push({
                date: dateKey,
                available: false,
                takenBy: takenDateMap[dateKey].user,
            });
        } else {
            available.push({
                date: dateKey,
                available: true,
                takenBy: null,
            });
        }
    }

    return available;
};

/**
 * Get current user's scheduled dates for a month
 */
const getMyScheduledDates = async (userId, year, month) => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        throw new AppError('Invalid year or month', 400);
    }

    const monthKey = toMonthKey(y, m);

    const schedules = await MarketSchedule.find({
        user: userId,
        monthKey,
        status: 'active',
    })
        .populate('user', 'name email image')
        .sort({ date: 1 })
        .lean();

    return schedules;
};

/**
 * Check if a user should receive an email notification based on their preferences.
 * Respects notificationPreferences.email and notificationPreferences.types.
 * Defaults to sending if no preferences are set.
 */
const shouldSendNotificationEmail = (user, notificationType) => {
    const prefs = user.notificationPreferences;
    if (!prefs) return true;
    if (prefs.email === false) return false;
    if (prefs.types && notificationType && prefs.types[notificationType] === false) return false;
    return true;
};

/**
 * Sync a user's market schedule selections for a month.
 *
 * Computes the diff between what the user currently has in the DB and what they
 * request now. Removes deselected dates (soft-delete to 'superseded') and adds
 * new ones. This allows users to change their selections without hitting the old
 * "maximum dates exceeded" 400 error.
 *
 * Idempotent: calling with the same dates is a no-op.
 * Race-safe: DB unique index on `date` prevents double-booking.
 */
const selectDates = async (userId, dates, year, month, source = 'user') => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        throw new AppError('Invalid year or month', 400);
    }

    if (!Array.isArray(dates) || dates.length === 0) {
        throw new AppError('At least one date is required', 400);
    }

    if (dates.length > MAX_DATES_PER_MONTH) {
        throw new AppError(`Maximum ${MAX_DATES_PER_MONTH} dates allowed per month`, 400);
    }

    // ── Pure validation (weekend-only, consecutive-day, hygiene) ───────
    const validation = validateMarketSchedule(dates, userId, { year: y, month: m });
    if (!validation.valid) {
        throw new AppError(validation.details, 400);
    }

    const monthKey = toMonthKey(y, m);

    // ── 1. Normalize and validate requested dates ─────────────────────
    const normalizedDates = dates.map((d) => {
        const parsed = parseDate(d);
        return normalizeToUTC(parsed);
    });

    for (const d of normalizedDates) {
        if (d.getUTCMonth() + 1 !== m || d.getUTCFullYear() !== y) {
            throw new AppError('All dates must be in the specified month and year', 400);
        }
    }

    const today = normalizeToUTC(new Date());
    for (const d of normalizedDates) {
        if (d < today) {
            throw new AppError('Cannot select dates in the past', 400);
        }
    }

    // ── 2. Fetch existing active dates for this user+month ────────────
    const existingDates = await MarketSchedule.find({
        user: userId,
        monthKey,
        status: 'active',
    }).lean();

    const existingDateMap = new Map();
    for (const s of existingDates) {
        existingDateMap.set(toDateKey(normalizeToUTC(s.date)), s);
    }

    // ── 2b. Defensive check: query ALL active records for the requested dates
    // This prevents 409 errors from the unique index by filtering out dates
    // that are already taken by OTHER users (or by superseded/reset records
    // if the index is non-partial due to a stale deployment).
    const requestedNormalizedKeys = normalizedDates.map((d) => toDateKey(d));
    const allActiveForDates = await MarketSchedule.find({
        monthKey,
        status: 'active',
        date: { $in: normalizedDates },
    }).lean();

    const takenByOthersMap = new Map();
    for (const s of allActiveForDates) {
        const dateKey = toDateKey(normalizeToUTC(s.date));
        // Only flag as "taken by others" if it's NOT the current user's own record
        if (s.user.toString() !== userId.toString()) {
            takenByOthersMap.set(dateKey, s);
        }
    }

    const requestedDateKeys = new Set(requestedNormalizedKeys);

    // ── 3. Compute the diff ──────────────────────────────────────────
    // Dates user had but did not request this time → remove
    const toRemove = existingDates.filter(
        (s) => !requestedDateKeys.has(toDateKey(normalizeToUTC(s.date)))
    );

    // Dates user requested but does not have yet → add (excluding taken-by-others)
    const toAdd = normalizedDates.filter(
        (d) => !existingDateMap.has(toDateKey(d)) && !takenByOthersMap.has(toDateKey(d))
    );

    const skippedDueToConflict = normalizedDates.length - toAdd.length -
        existingDates.filter((s) => requestedDateKeys.has(toDateKey(normalizeToUTC(s.date)))).length;

    // No changes needed (idempotent)
    if (toRemove.length === 0 && toAdd.length === 0) {
        return {
            inserted: 0,
            removed: 0,
            skipped: skippedDueToConflict > 0 ? skippedDueToConflict : dates.length,
            total: existingDates.length,
            conflicts: skippedDueToConflict > 0 ? takenByOthersMap.size : 0,
        };
    }

    // ── 4. Validate final count ──────────────────────────────────────
    const finalCount = existingDates.length - toRemove.length + toAdd.length;
    if (finalCount > MAX_DATES_PER_MONTH) {
        throw new AppError(
            `Selection would result in ${finalCount} dates. Maximum ${MAX_DATES_PER_MONTH} allowed.`,
            400
        );
    }

    // ── 5. Atomic replace: soft-delete old + insert new ────────────────
    // Strategy: try transaction first (Atlas/replica set). If unsupported,
    // fall back to insert-first → soft-delete (safe: failed soft-delete
    // means extra dates, not lost dates).
    let removedCount = 0;
    let inserted = [];

    const newSchedules = toAdd.map((d) => ({
        date: d,
        user: userId,
        month: m,
        year: y,
        monthKey,
        source,
        status: 'active',
        isManuallySelected: source === 'user',
    }));

    const removeIds = toRemove.map((s) => s._id);

    const executeAtomicReplace = async (session) => {
        // Soft-delete removed dates within the transaction
        if (removeIds.length > 0) {
            const opts = session ? { session } : {};
            const result = await MarketSchedule.updateMany(
                { _id: { $in: removeIds } },
                { $set: { status: 'superseded' } },
                opts,
            );
            removedCount = result.modifiedCount || removeIds.length;
        }

        // Insert new dates within the transaction
        if (newSchedules.length > 0) {
            const opts = session ? { session } : {};
            try {
                inserted = await MarketSchedule.insertMany(newSchedules, { ordered: false, ...opts });
            } catch (err) {
                if (err.code === 11000) {
                    const insertedDocs = err.insertedDocs || [];
                    const duplicateCount = newSchedules.length - insertedDocs.length;
                    if (insertedDocs.length === 0) {
                        throw new AppError('Date(s) already taken by another member', 409);
                    }
                    inserted = insertedDocs;
                    logger.warn(
                        `[MarketSchedule] Partial insert: ${inserted.length} succeeded, ${duplicateCount} rejected (conflict)`
                    );
                } else {
                    throw err;
                }
            }
        }
    };

    let usedTransaction = false;
    try {
        const session = await MarketSchedule.startSession();
        try {
            await session.withTransaction(async () => {
                await executeAtomicReplace(session);
            });
            usedTransaction = true;
        } finally {
            session.endSession();
        }
    } catch (txErr) {
        // Transaction not supported (standalone MongoDB) or failed.
        // Fall back to non-atomic: insert first, then soft-delete.
        // This is safe because a failed soft-delete leaves extra dates
        // (no data loss), whereas the old approach (delete first) lost data.
        const txMsg = (txErr.message || '').toLowerCase();
        if (txMsg.includes('replica set') || txMsg.includes('transaction') || txMsg.includes('session') || txMsg.includes('abort') || txErr.code === 48 || txErr.code === 263) {
            logger.warn('[MarketSchedule] Transactions not supported, falling back to non-atomic replace');
            inserted = [];
            removedCount = 0;
            await executeAtomicReplace(null);
        } else {
            throw txErr;
        }
    }

    // Google Calendar cleanup for removed dates (fire-and-forget, outside transaction)
    for (const s of toRemove) {
        if (s.googleCalendarEventId) {
            googleCalendarService.removeEventFromCalendar(userId, s.googleCalendarEventId)
                .catch((err) => logger.error(`[MarketSchedule] GC cleanup failed: ${err.message}`));
        }
    }

    if (inserted.length === 0 && removedCount === 0) {
        return {
            inserted: 0,
            removed: 0,
            skipped: skippedDueToConflict > 0 ? skippedDueToConflict : dates.length,
            total: existingDates.length,
            conflicts: skippedDueToConflict > 0 ? takenByOthersMap.size : 0,
        };
    }

    // ── 7. Return response IMMEDIATELY (before side-effects) ─────────
    const result = {
        inserted: inserted.length,
        removed: removedCount,
        skipped: skippedDueToConflict,
        total: existingDates.length - removedCount + inserted.length,
        conflicts: skippedDueToConflict,
    };

    // ── 8. Post-change side-effects (truly fire-and-forget) ──────────
    if (inserted.length > 0) {
        const scheduleIds = inserted.map((s) => s._id);
        const dateLabels = inserted
            .map((s) => new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }))
            .join(', ');

        User.findById(userId).lean().then((user) => {
            // 1. Confirmation email with .ics calendar invite
            if (user?.email && shouldSendNotificationEmail(user, 'SYSTEM')) {
                generateMarketDutyICS({ userName: user.name || 'Member', dates: inserted })
                    .then((icsBuffer) => emailService.sendMarketScheduleConfirmationEmail(user.email, user.name || 'Member', inserted, icsBuffer))
                    .then(() => logger.info(`[MarketSchedule] Confirmation email sent to ${user.email}`))
                    .catch((err) => logger.error(`[MarketSchedule] Email send failed for ${userId}: ${err.message}`));
            }

            // 2. In-app notification to the member
            notificationService.createAndSend(
                userId, 'SYSTEM', 'Market Duty Scheduled',
                `You have scheduled market duty for ${dateLabels}.`,
                {
                    priority: 'NORMAL',
                    actionUrl: '/events?view=markets',
                    metadata: { type: 'market_schedule_update', scheduleIds },
                    idempotencyKey: `market_selected_${userId}_${scheduleIds.sort().join('_')}`,
                }
            ).catch((err) => logger.error(`[MarketSchedule] In-app notification failed for ${userId}: ${err.message}`));

            // 3. Notify all admins (in-app only)
            User.find({ role: 'admin', isActive: true }).lean().then((admins) => {
                for (const admin of admins) {
                    notificationService.createAndSend(
                        admin._id, 'SYSTEM', 'Market Date Selection',
                        `${user.name || 'A member'} selected market duty for ${dateLabels}.`,
                        {
                            priority: 'LOW',
                            actionUrl: '/events?view=markets',
                            metadata: { type: 'market_schedule_admin_notice', memberId: userId, scheduleIds },
                        }
                    ).catch((err) => logger.error(`[MarketSchedule] Admin notification failed: ${err.message}`));
                }
            }).catch((err) => logger.error(`[MarketSchedule] Admin query failed: ${err.message}`));

            // 4. Google Calendar sync (fire-and-forget)
            if (user?.googleCalendarSyncEnabled) {
                googleCalendarService.syncDatesToCalendar(userId, inserted).then(async (syncResults) => {
                    const syncedIds = syncResults.filter((r) => r.success).map((r) => r.scheduleId);
                    const failedIds = syncResults.filter((r) => !r.success).map((r) => r.scheduleId);
                    if (syncedIds.length > 0) {
                        await MarketSchedule.updateMany({ _id: { $in: syncedIds } }, { googleSyncStatus: 'synced' });
                    }
                    if (failedIds.length > 0) {
                        await MarketSchedule.updateMany({ _id: { $in: failedIds } }, { googleSyncStatus: 'failed' });
                    }
                }).catch((err) => {
                    logger.error(`[MarketSchedule] Google Calendar sync failed for ${userId}: ${err.message}`);
                    MarketSchedule.updateMany({ _id: { $in: scheduleIds } }, { googleSyncStatus: 'failed' }).catch(() => {});
                });
            }
        }).catch((err) => logger.error(`[MarketSchedule] Side-effects setup failed: ${err.message}`));
    }

    return result;
};

/**
 * Remove a scheduled date (soft-delete: sets status to "superseded").
 */
const removeScheduledDate = async (scheduleId, userId) => {
    const schedule = await MarketSchedule.findById(scheduleId).lean();
    if (!schedule) {
        throw new AppError('Scheduled date not found', 404);
    }

    if (schedule.user.toString() !== userId.toString()) {
        throw new AppError('You can only remove your own scheduled dates', 403);
    }

    if (schedule.googleCalendarEventId) {
        try {
            await googleCalendarService.removeEventFromCalendar(userId, schedule.googleCalendarEventId);
        } catch (err) {
            logger.error(`Google Calendar event removal failed: ${err.message}`);
        }
    }

    await MarketSchedule.findByIdAndUpdate(scheduleId, {
        status: 'superseded',
        googleCalendarEventId: null,
        googleSyncStatus: null,
    });

    return { removed: true };
};

/**
 * Restore reset schedules for a specific month (admin-only).
 * Reactivates records that were soft-deleted by the cron reset.
 * Used for recovery when the cron accidentally reset current-month data.
 */
const restoreMonthSchedules = async (year, month) => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        throw new AppError('Invalid year or month', 400);
    }

    const monthKey = toMonthKey(y, m);

    const result = await MarketSchedule.updateMany(
        { monthKey, status: 'reset' },
        { $set: { status: 'active' } }
    );

    return { restored: result.modifiedCount, monthKey };
};

module.exports = {
    getMonthSchedule,
    getAvailableDates,
    getMyScheduledDates,
    selectDates,
    removeScheduledDate,
    restoreMonthSchedules,
    MAX_DATES_PER_MONTH,
    toMonthKey,
};
