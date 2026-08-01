const MealPollAuditLog = require('../models/MealPollAuditLog.model');
const AppError = require('../utils/errors/AppError');

const VALID_MONTH_REGEX = /^\d{4}-\d{2}$/;
const VALID_DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Write an audit log entry. Append-only, idempotent via requestId.
 * Returns the created log, or null if idempotent duplicate.
 */
const writeAuditLog = async ({ userId, eventType, pollDate, previousState, newState, requestId, source }) => {
    const ts = new Date();
    const pollDateObj = pollDate instanceof Date ? pollDate : new Date(pollDate);

    const year = pollDateObj.getUTCFullYear();
    const month = String(pollDateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(pollDateObj.getUTCDate()).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    const dayKey = `${year}-${month}-${day}`;

    const doc = {
        user: userId,
        eventType,
        pollDate: pollDateObj,
        previousState: previousState
            ? { type: previousState.type, updatedAt: previousState.updatedAt }
            : { type: null, updatedAt: null },
        newState: { type: newState.type, updatedAt: newState.updatedAt || ts },
        timestamp: ts,
        monthKey,
        dayKey,
        source: source || 'manual',
    };

    if (requestId) {
        doc.requestId = requestId;
    }

    try {
        return await MealPollAuditLog.create(doc);
    } catch (err) {
        if (err.code === 11000) return null;
        throw err;
    }
};

/**
 * List months that have audit logs.
 */
const getAuditMonths = async () => {
    const months = await MealPollAuditLog.aggregate([
        { $group: { _id: '$monthKey', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $project: { _id: 0, monthKey: '$_id', count: 1 } },
    ]);
    return months;
};

/**
 * List days within a given month that have audit logs (paginated).
 */
const getAuditDays = async (monthKey, { page = 1, limit = 50 } = {}) => {
    if (!VALID_MONTH_REGEX.test(monthKey)) {
        throw new AppError('Invalid monthKey format. Use YYYY-MM', 400);
    }

    const effectiveLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const effectivePage = Math.max(parseInt(page, 10) || 1, 1);
    const filter = { monthKey };
    const skip = (effectivePage - 1) * effectiveLimit;

    const [days, total] = await Promise.all([
        MealPollAuditLog.aggregate([
            { $match: filter },
            { $group: { _id: '$dayKey', count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $skip: skip },
            { $limit: effectiveLimit },
            { $project: { _id: 0, dayKey: '$_id', count: 1 } },
        ]),
        MealPollAuditLog.distinct('dayKey', filter).then((d) => d.length),
    ]);

    return {
        days,
        pagination: {
            page: effectivePage,
            limit: effectiveLimit,
            total,
            pages: Math.ceil(total / effectiveLimit),
            hasNext: skip + days.length < total,
            hasPrev: effectivePage > 1,
        },
    };
};

/**
 * Get full log entries for a specific day (paginated).
 */
const getAuditLogsByDay = async (dayKey, { page = 1, limit = 50 } = {}) => {
    if (!VALID_DAY_REGEX.test(dayKey)) {
        throw new AppError('Invalid dayKey format. Use YYYY-MM-DD', 400);
    }

    const effectiveLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const effectivePage = Math.max(parseInt(page, 10) || 1, 1);
    const filter = { dayKey };
    const skip = (effectivePage - 1) * effectiveLimit;

    const [logs, total] = await Promise.all([
        MealPollAuditLog.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(effectiveLimit)
            .populate('user', 'name email image')
            .lean(),
        MealPollAuditLog.countDocuments(filter),
    ]);

    return {
        logs,
        pagination: {
            page: effectivePage,
            limit: effectiveLimit,
            total,
            pages: Math.ceil(total / effectiveLimit),
            hasNext: skip + logs.length < total,
            hasPrev: effectivePage > 1,
        },
    };
};

/**
 * Get full log entries for a date range (used by the Events Calendar "Votes" tab).
 * Accepts startDate/endDate ISO strings, returns logs sorted newest-first.
 */
const MAX_RANGE_LIMIT = 1000;

const getAuditLogsForRange = async ({ startDate, endDate, page = 1, limit = 9999 } = {}) => {
    const effectiveLimit = Math.min(Math.max(parseInt(limit, 10) || 9999, 1), MAX_RANGE_LIMIT);
    const effectivePage = Math.max(parseInt(page, 10) || 1, 1);

    const filter = {};
    if (startDate || endDate) {
        filter.pollDate = {};
        if (startDate) filter.pollDate.$gte = new Date(startDate);
        if (endDate)   filter.pollDate.$lte = new Date(endDate);
    }

    const skip = (effectivePage - 1) * effectiveLimit;

    const [logs, total] = await Promise.all([
        MealPollAuditLog.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(effectiveLimit)
            .populate('user', 'name email image')
            .lean(),
        MealPollAuditLog.countDocuments(filter),
    ]);

    return {
        logs,
        pagination: {
            page: effectivePage,
            limit: effectiveLimit,
            total,
            pages: Math.ceil(total / effectiveLimit),
            hasNext: skip + logs.length < total,
            hasPrev: effectivePage > 1,
        },
    };
};

module.exports = {
    writeAuditLog,
    getAuditMonths,
    getAuditDays,
    getAuditLogsByDay,
    getAuditLogsForRange,
};
