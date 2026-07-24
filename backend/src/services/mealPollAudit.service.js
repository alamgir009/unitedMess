const MealPollAuditLog = require('../models/MealPollAuditLog.model');
const AppError = require('../utils/errors/AppError');

const VALID_MONTH_REGEX = /^\d{4}-\d{2}$/;
const VALID_DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Write an audit log entry. Append-only, idempotent via requestId.
 * Returns the created log, or null if idempotent duplicate.
 */
const writeAuditLog = async ({ userId, eventType, pollDate, previousState, newState, requestId }) => {
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

    const filter = { monthKey };
    const skip = (page - 1) * limit;

    const [days, total] = await Promise.all([
        MealPollAuditLog.aggregate([
            { $match: filter },
            { $group: { _id: '$dayKey', count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $project: { _id: 0, dayKey: '$_id', count: 1 } },
        ]),
        MealPollAuditLog.distinct('dayKey', filter).then((d) => d.length),
    ]);

    return {
        days,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: skip + days.length < total,
            hasPrev: page > 1,
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

    const filter = { dayKey };
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        MealPollAuditLog.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'name email image')
            .lean(),
        MealPollAuditLog.countDocuments(filter),
    ]);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: skip + logs.length < total,
            hasPrev: page > 1,
        },
    };
};

module.exports = {
    writeAuditLog,
    getAuditMonths,
    getAuditDays,
    getAuditLogsByDay,
};
