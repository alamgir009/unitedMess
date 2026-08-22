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
 * Member selects dates for market duty.
 * Uses DB unique index on `date` for concurrency safety — no check-then-write.
 * On duplicate key error (11000), returns 409 Conflict.
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

    const existingDates = await MarketSchedule.find({
        user: userId,
        monthKey,
        status: 'active',
    }).lean();

    const totalAfterSelection = existingDates.length + dates.length;
    if (totalAfterSelection > MAX_DATES_PER_MONTH) {
        throw new AppError(
            `You already have ${existingDates.length} date(s) selected. Maximum ${MAX_DATES_PER_MONTH} allowed.`,
            400
        );
    }

    const normalizedDates = dates.map((d) => {
        const parsed = parseDate(d);
        return normalizeToUTC(parsed);
    });

    for (const d of normalizedDates) {
        const monthOfDate = d.getUTCMonth() + 1;
        const yearOfDate = d.getUTCFullYear();
        if (monthOfDate !== m || yearOfDate !== y) {
            throw new AppError('All dates must be in the specified month and year', 400);
        }
    }

    const today = normalizeToUTC(new Date());
    for (const d of normalizedDates) {
        if (d < today) {
            throw new AppError('Cannot select dates in the past', 400);
        }
    }

    const existingDateKeys = new Set(
        existingDates.map((s) => normalizeToUTC(s.date).toISOString().split('T')[0])
    );

    const newSchedules = [];
    for (const d of normalizedDates) {
        const dateKey = d.toISOString().split('T')[0];

        if (existingDateKeys.has(dateKey)) {
            continue;
        }

        newSchedules.push({
            date: d,
            user: userId,
            month: m,
            year: y,
            monthKey,
            source,
            status: 'active',
            isManuallySelected: source === 'user',
        });
    }

    if (newSchedules.length === 0) {
        return { inserted: 0, skipped: dates.length, total: existingDates.length };
    }

    let inserted = [];
    try {
        inserted = await MarketSchedule.insertMany(newSchedules, { ordered: false });
    } catch (err) {
        if (err.code === 11000) {
            const insertedDocs = err.insertedDocs || [];
            const duplicateCount = newSchedules.length - insertedDocs.length;
            if (insertedDocs.length === 0) {
                throw new AppError(
                    `Date(s) already taken by another member`,
                    409
                );
            }
            inserted = insertedDocs;
            logger.warn(
                `[MarketSchedule] Partial insert: ${inserted.length} succeeded, ${duplicateCount} rejected (conflict)`
            );
        } else {
            throw err;
        }
    }

    if (inserted.length === 0) {
        return { inserted: 0, skipped: dates.length, total: existingDates.length };
    }

    // ── Post-insertion: email, calendar invite, notifications (fire-and-forget) ──
    // Fetch user data once for all downstream operations
    const user = await User.findById(userId).lean();

    // 1. Send confirmation email with .ics calendar invite
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

    // 2. Send in-app notification to the member
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

    // 3. Notify all admins (in-app only — no email to avoid fatigue at scale)
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

    // 4. Google Calendar sync (if user has connected — legacy path, fire-and-forget)
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

    return {
        inserted: inserted.length,
        skipped: dates.length - inserted.length,
        total: existingDates.length + inserted.length,
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
