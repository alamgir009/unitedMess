const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');

// The record and pending delta are saved together. The user update records the
// applied revision in the same atomic write as the increment, even on standalone MongoDB.
const stageCalendarTotals = (record, increments, retireFor) => {
    const previousRevision = record.calendarTotals?.revision;
    record.$where = {
        ...record.$where,
        updatedAt: record.updatedAt ?? null,
        'calendarTotals.revision': previousRevision ?? null,
        'calendarTotals.increments': null,
    };
    if (retireFor || Object.values(increments).some(Boolean)) {
        record.calendarTotals = { revision: (previousRevision ?? 0) + 1, increments, ...(retireFor && { retireFor }) };
    }
};

const settleCalendarTotals = async (Model, record) => {
    const { revision, increments, retireFor } = record.calendarTotals ?? {};
    const delta = Object.fromEntries(Object.entries(increments ?? {}).filter(([, amount]) => typeof amount === 'number'));
    if (Object.keys(delta).length === 0) return false;

    const userId = record.user?._id ?? record.user;
    const marker = `calendarTotalRevisions.${Model.modelName}_${record._id}`;
    const relation = Model.modelName === 'Market' ? 'markets' : 'meals';
    const applied = await User.updateOne(
        { _id: userId, $or: [{ [marker]: { $exists: false } }, { [marker]: { $lt: revision } }] },
        { $inc: delta, $set: { [marker]: revision }, ...(retireFor && { $pull: { [relation]: record._id } }) },
    );
    if (!applied.matchedCount && !await User.exists({ _id: userId, [marker]: { $gte: revision } })) {
        throw new AppError('Record owner not found when updating calendar totals', 404);
    }

    await Model.updateOne(
        { _id: record._id, 'calendarTotals.revision': revision },
        { $unset: { 'calendarTotals.increments': 1 } },
        { timestamps: false },
    );
    if (record.set) {
        record.set('calendarTotals.increments', undefined);
        record.unmarkModified('calendarTotals.increments');
    } else {
        delete record.calendarTotals.increments;
    }
    return true;
};

const retireCalendarRecord = async (Model, record, increments, retireFor = record.calendarTotals?.retireFor ?? record._id) => {
    const existingRetirement = record.calendarTotals?.retireFor;
    if (existingRetirement && String(existingRetirement) !== String(retireFor)) {
        throw new AppError('Another edit is already replacing this entry', 409);
    }

    await settleCalendarTotals(Model, record);
    if (!existingRetirement) {
        stageCalendarTotals(record, increments, retireFor);
        try {
            await record.save({ timestamps: false, validateBeforeSave: false });
        } catch (error) {
            if (error.name === 'DocumentNotFoundError') {
                throw new AppError('This entry changed. Refresh the calendar and try again.', 409);
            }
            throw error;
        }
        await settleCalendarTotals(Model, record);
    }
    await Model.deleteOne({ _id: record._id, 'calendarTotals.retireFor': retireFor });
};

let refreshingPayables = false;
let refreshRequested = false;

const refreshCalendarPayables = async () => {
    refreshRequested = true;
    if (refreshingPayables) return;
    refreshingPayables = true;
    const { recalculateAllActiveUsersPayable } = require('./user.service');
    try {
        // Writes received during a refresh share the next pass.
        while (refreshRequested) {
            refreshRequested = false;
            await recalculateAllActiveUsersPayable();
        }
    } catch (error) {
        console.error('[Calendar] Failed to recalculate payables:', error.message);
    } finally {
        refreshingPayables = false;
    }
};

module.exports = { stageCalendarTotals, settleCalendarTotals, retireCalendarRecord, refreshCalendarPayables };
