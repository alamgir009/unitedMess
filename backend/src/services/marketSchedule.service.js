const MarketSchedule = require('../models/MarketSchedule.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const { parseDate, normalizeToUTC } = require('../utils/helpers/date.helper');
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
        const dateKey = normalizeToUTC(s.date).toISOString().split('T')[0];
        takenDateMap[dateKey] = s;
    }

    const daysInMonth = new Date(y, m, 0).getDate();
    const today = normalizeToUTC(new Date());
    const available = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = normalizeToUTC(new Date(Date.UTC(y, m - 1, d)));
        const dateKey = dateObj.toISOString().split('T')[0];

        if (dateObj < today) continue;

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
        existingDateMap.set(normalizeToUTC(s.date).toISOString().split('T')[0], s);
    }

    const requestedDateKeys = new Set(
        normalizedDates.map((d) => d.toISOString().split('T')[0])
    );

    // ── 3. Compute the diff ──────────────────────────────────────────
    // Dates user had but did not request this time → remove
    const toRemove = existingDates.filter(
        (s) => !requestedDateKeys.has(normalizeToUTC(s.date).toISOString().split('T')[0])
    );

    // Dates user requested but does not have yet → add
    const toAdd = normalizedDates.filter(
        (d) => !existingDateMap.has(d.toISOString().split('T')[0])
    );

    // No changes needed (idempotent)
    if (toRemove.length === 0 && toAdd.length === 0) {
        return { inserted: 0, removed: 0, skipped: dates.length, total: existingDates.length };
    }

    // ── 4. Validate final count ──────────────────────────────────────
    const finalCount = existingDates.length - toRemove.length + toAdd.length;
    if (finalCount > MAX_DATES_PER_MONTH) {
        throw new AppError(
            `Selection would result in ${finalCount} dates. Maximum ${MAX_DATES_PER_MONTH} allowed.`,
            400
        );
    }

    // ── 5. Soft-delete removed dates ─────────────────────────────────
    let removedCount = 0;
    if (toRemove.length > 0) {
        const removeIds = toRemove.map((s) => s._id);

        await MarketSchedule.updateMany(
            { _id: { $in: removeIds } },
            { $set: { status: 'superseded' } }
        );

        removedCount = toRemove.length;

        // Google Calendar cleanup for removed dates (fire-and-forget)
        for (const s of toRemove) {
            if (s.googleCalendarEventId) {
                googleCalendarService.removeEventFromCalendar(userId, s.googleCalendarEventId)
                    .catch((err) => logger.error(`[MarketSchedule] GC cleanup failed: ${err.message}`));
            }
        }
    }

    // ── 6. Insert new dates ──────────────────────────────────────────
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

    let inserted = [];
    if (newSchedules.length > 0) {
        try {
            inserted = await MarketSchedule.insertMany(newSchedules, { ordered: false });
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

    if (inserted.length === 0 && removedCount === 0) {
        return { inserted: 0, removed: 0, skipped: dates.length, total: existingDates.length };
    }

    // ── 7. Post-change side-effects (fire-and-forget) ────────────────
    if (inserted.length > 0) {
        const user = await User.findById(userId).lean();

        // 1. Confirmation email with .ics calendar invite
        if (user?.email) {
            const shouldSendEmail = shouldSendNotificationEmail(user, 'SYSTEM');
            if (shouldSendEmail) {
                try {
                    const icsBuffer = generateMarketDutyICS({
                        userName: user.name || 'Member',
                        dates: inserted,
                    });
                    await emailService.sendMarketScheduleConfirmationEmail(
                        user.email,
                        user.name || 'Member',
                        inserted,
                        icsBuffer
                    );
                    logger.info(`[MarketSchedule] Confirmation email sent to ${user.email}`);
                } catch (err) {
                    logger.error(`[MarketSchedule] Email send failed for ${userId}: ${err.message}`);
                }
            }
        }

        // 2. In-app notification to the member
        try {
            const dateLabels = inserted
                .map((s) => new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }))
                .join(', ');
            await notificationService.createAndSend(
                userId,
                'SYSTEM',
                'Market Duty Scheduled',
                `You have scheduled market duty for ${dateLabels}.`,
                {
                    priority: 'NORMAL',
                    actionUrl: '/events?view=markets',
                    metadata: { type: 'market_schedule_update', scheduleIds: inserted.map((s) => s._id) },
                    idempotencyKey: `market_selected_${userId}_${inserted.map((s) => s._id).sort().join('_')}`,
                }
            );
        } catch (err) {
            logger.error(`[MarketSchedule] In-app notification failed for ${userId}: ${err.message}`);
        }

        // 3. Notify all admins (in-app only)
        try {
            const admins = await User.find({ role: 'admin', isActive: true }).lean();
            const dateLabels = inserted
                .map((s) => new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }))
                .join(', ');

            for (const admin of admins) {
                await notificationService.createAndSend(
                    admin._id,
                    'SYSTEM',
                    'Market Date Selection',
                    `${user.name || 'A member'} selected market duty for ${dateLabels}.`,
                    {
                        priority: 'LOW',
                        actionUrl: '/events?view=markets',
                        metadata: { type: 'market_schedule_admin_notice', memberId: userId, scheduleIds: inserted.map((s) => s._id) },
                    }
                );
            }
        } catch (err) {
            logger.error(`[MarketSchedule] Admin notification failed: ${err.message}`);
        }

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
                MarketSchedule.updateMany(
                    { _id: { $in: inserted.map((s) => s._id) } },
                    { googleSyncStatus: 'failed' }
                ).catch(() => {});
            });
        }
    }

    return {
        inserted: inserted.length,
        removed: removedCount,
        skipped: dates.length - inserted.length,
        total: existingDates.length - removedCount + inserted.length,
    };
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

module.exports = {
    getMonthSchedule,
    getAvailableDates,
    getMyScheduledDates,
    selectDates,
    removeScheduledDate,
    MAX_DATES_PER_MONTH,
    toMonthKey,
};
