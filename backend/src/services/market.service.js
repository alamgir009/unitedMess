const mongoose = require('mongoose');
const Market = require('../models/Market.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const pick = require('../utils/helpers/pick');
const { isPositiveCurrencyAmount } = require('../utils/validators/common.validator');
const { parseDate, normalizeDate } = require('../utils/helpers/date.helper');
const { recalculateAllActiveUsersPayable } = require('./user.service');
const { stageCalendarTotals, settleCalendarTotals, retireCalendarRecord, refreshCalendarPayables } = require('./calendarRecordTotals.service');

const validateItems = (items) => {
    if (typeof items !== 'string' || (items.trim().match(/\p{L}/gu)?.length ?? 0) < 4) {
        throw new AppError('Items purchased must contain at least 4 letters.', 400);
    }
    return items.trim();
};

const validateAmount = (amount) => {
    if (!isPositiveCurrencyAmount(amount)) {
        throw new AppError('Amount must be greater than 0 with at most 2 decimal places.', 400);
    }
    return Number(amount);
};

/**
 * Bulk create markets for multiple users on a single date.
 * Idempotent: skips users who already have a market entry for that date.
 */
const bulkCreateMarkets = async ({ userIds, date, amount: inputAmount, items: inputItems, description }) => {
    const parsedDate = normalizeDate(parseDate(date));
    const items = validateItems(inputItems);
    const amount = validateAmount(inputAmount);

    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('At least one user must be selected', 400);
    }

    // Verify all users exist
    const users = await User.find({ _id: { $in: userIds } }).select('_id markets totalMarketAmount').lean();
    if (users.length !== userIds.length) {
        throw new AppError('One or more users not found', 404);
    }

    // Find which users already have a market entry for this date
    const existingMarkets = await Market.find({
        user: { $in: userIds },
        date: parsedDate,
    }).select('user').lean();

    const existingUserIds = new Set(existingMarkets.map((m) => m.user.toString()));

    // Build insert docs for users without an existing entry
    const insertDocs = [];
    const userUpdates = [];
    let skippedCount = 0;

    for (const uid of userIds) {
        if (existingUserIds.has(uid.toString())) {
            skippedCount++;
            continue;
        }

        const marketId = new mongoose.Types.ObjectId();
        insertDocs.push({
            _id: marketId,
            user: uid,
            date: parsedDate,
            amount,
            items: items.trim(),
            ...(description && { description }),
        });

        userUpdates.push({
            updateOne: {
                filter: { _id: uid },
                update: {
                    $push: { markets: marketId },
                    $inc: { totalMarketAmount: amount },
                },
            },
        });
    }

    // Execute bulk writes
    if (insertDocs.length > 0) {
        await Market.insertMany(insertDocs, { ordered: false });
    }

    if (userUpdates.length > 0) {
        await User.bulkWrite(userUpdates);
    }

    // Recalculate payable for all active users
    recalculateAllActiveUsersPayable();

    return {
        inserted: insertDocs.length,
        skipped: skippedCount,
        total: userIds.length,
    };
};

/**
 * Create a market entry
 */
const createMarket = async (marketBody) => {
    const { user, description, image } = marketBody;
    const date = normalizeDate(parseDate(marketBody.date));
    const items = validateItems(marketBody.items);
    const amount = validateAmount(marketBody.amount);

    // Use exists() — faster than findOne(), no document fetch needed
    if (await Market.exists({ user, date })) {
        throw new AppError('Market already exists for this date', 409);
    }

    const marketData = {
        user,
        date,
        amount,
        items: items.trim(),
        ...(description && { description }),
        ...(image && { image }),
    };

    const newMarket = await mongoose.connection.transaction(async (session) => {
        const [record] = await Market.create([marketData], { session });
        const owner = await User.findByIdAndUpdate(
            user,
            {
                $push: { markets: record._id },
                $inc: { totalMarketAmount: amount },
            },
            { session, runValidators: true },
        );
        if (!owner) throw new AppError('Market entry owner not found', 404);
        return record;
    });

    refreshCalendarPayables();
    return newMarket;
};

/**
 * Query markets with optional filter & options
 */
const queryMarkets = async (filter, options = {}, populateUser = false) => {
    let sort = { date: -1 };

    if (options.sortBy) {
        const [field, order] = options.sortBy.split(':');
        sort = { [field]: order === 'asc' ? 1 : -1 };
    }

    const getAll = options.limit === 'all';
    const limit = getAll ? 0 : (parseInt(options.limit) || 10);
    const page  = parseInt(options.page)  || 1;
    const skip  = getAll ? 0 : (page - 1) * limit;

    let query = Market.find(filter).sort(sort);

    if (!getAll) {
        query = query.skip(skip).limit(limit);
    }

    query = query.lean();

    if (populateUser) query = query.populate('user', 'name email image');

    const [markets, total] = await Promise.all([
        query.exec(),
        Market.countDocuments(filter),
    ]);

    const totalPages = getAll ? 1 : Math.ceil(total / limit);

    return {
        markets,
        pagination: {
            page:    getAll ? 1     : page,
            limit:   getAll ? total : limit,
            total,
            pages:   totalPages,
            hasNext: getAll ? false : skip + markets.length < total,
            hasPrev: getAll ? false : page > 1,
            isAll:   getAll,
        },
    };
};

/**
 * Get market by id
 */
const getMarketById = async (id, includeTotals = false) => {
    const query = Market.findById(id);
    if (includeTotals) query.select('+calendarTotals');
    return query.populate('user', 'name email');
};

/**
 * Update market by id
 */
const updateMarketById = async (marketId, input, existingMarket) => {
    const market = existingMarket ?? await getMarketById(marketId, true);
    if (!market) throw new AppError('Market not found', 404);

    const updateBody = pick(input, ['date', 'amount', 'items', 'description', 'image']);
    if ('items' in updateBody) updateBody.items = validateItems(updateBody.items);
    if ('amount' in updateBody) updateBody.amount = validateAmount(updateBody.amount);
    if (market.calendarTotals?.retireFor) throw new AppError('This market entry is being deleted', 409);
    const repairedTotals = await settleCalendarTotals(Market, market);
    const oldAmount = market.amount;
    const oldDate = market.date.getTime();

    if (updateBody.date) {
        const parsedDate = normalizeDate(parseDate(updateBody.date));

        if (oldDate !== parsedDate.getTime()) {
            // Date changed — check for duplicate
            const duplicate = await Market.exists({
                user: market.user._id,
                date: parsedDate,
                _id: { $ne: marketId }
            });
            if (duplicate) throw new AppError('A market entry already exists for this date', 409);

            updateBody.date = parsedDate;
        } else {
            // Same date sent from form — skip to avoid unnecessary save
            delete updateBody.date;
        }
    }

    Object.assign(market, updateBody);
    if (!market.isModified()) {
        if (repairedTotals) refreshCalendarPayables();
        return market;
    }
    const affectsPayable = repairedTotals || market.isModified('amount') || market.isModified('date');
    market.$where = { user: market.user._id, amount: oldAmount };
    stageCalendarTotals(market, { totalMarketAmount: market.amount - oldAmount });
    await market.save().catch((err) => {
        if (err.name === 'DocumentNotFoundError') {
            throw new AppError('This market entry changed. Refresh the calendar and try again.', 409);
        }
        throw err;
    });

    await settleCalendarTotals(Market, market);

    if (affectsPayable) refreshCalendarPayables();

    return market;
};

/**
 * Delete market by id
 */
const deleteMarketById = async (marketId, existingMarket) => {
    const market = existingMarket ?? await getMarketById(marketId, true);
    if (!market) throw new AppError('Market not found', 404);
    await retireCalendarRecord(Market, market, { totalMarketAmount: -market.amount });

    // Recalculate payable for all active users
    refreshCalendarPayables();

    return market;
};

/**
 * Verify a user exists — used by admin controllers
 */
const verifyUserExists = async (userId) => {
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404);
    return user;
};

module.exports = {
    createMarket,
    bulkCreateMarkets,
    queryMarkets,
    getMarketById,
    updateMarketById,
    deleteMarketById,
    verifyUserExists,
};
