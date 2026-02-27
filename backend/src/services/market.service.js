const mongoose = require('mongoose');
const Market = require('../models/Market.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const { parseDate } = require('../utils/helpers/date.helper');

/**
 * Create a market entry
 */
const createMarket = async (marketBody) => {
    const { user, amount, items, description, image } = marketBody;
    const date = parseDate(marketBody.date);

    if (!items || typeof items !== 'string' || !items.trim()) {
        throw new AppError('Items description is required and must be a non-empty string', 400);
    }

    // Use exists() — faster than findOne(), no document fetch needed
    if (await Market.exists({ user, date })) {
        throw new AppError('Market already exists for this date', 409);
    }

    const marketId = new mongoose.Types.ObjectId();

    const marketData = {
        _id: marketId,
        user,
        date,
        amount,
        items: items.trim(),
        ...(description && { description }),
        ...(image && { image }),
    };

    const [newMarket] = await Promise.all([
        Market.create(marketData),
        User.findByIdAndUpdate(
            user,
            {
                $push: { markets: marketId },
                $inc: { totalMarketAmount: amount },
            },
            { new: true, runValidators: true }
        ),
    ]);

    return newMarket;
};

/**
 * Query markets with optional filter & options
 */
// market.service.js
const queryMarkets = async (filter, options = {}, populateUser = false) => {
    let sort = { date: -1 };

    if (options.sortBy) {
        const [field, order] = options.sortBy.split(':');
        sort = { [field]: order === 'asc' ? 1 : -1 };
    }

    const limit = parseInt(options.limit) || 10;
    const page  = parseInt(options.page)  || 1;

    const query = Market.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    if (populateUser) query.populate('user', 'name email');

    return query;
};

/**
 * Get market by id
 */
const getMarketById = async (id) => {
    return Market.findById(id).populate('user', 'name email');
};

/**
 * Update market by id
 */
const updateMarketById = async (marketId, updateBody) => {
    const market = await getMarketById(marketId);
    if (!market) throw new AppError('Market not found', 404);

    const oldAmount = market.amount;

    // Date Logic 
    if (updateBody.date) {
        const parsedDate = parseDate(updateBody.date);

        if (market.date.getTime() !== parsedDate.getTime()) {
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

    // Items Sanitization 
    if (updateBody.items !== undefined) {
        if (typeof updateBody.items !== 'string' || !updateBody.items.trim()) {
            throw new AppError('Items must be a non-empty string', 400);
        }
        updateBody.items = updateBody.items.trim();
    }

    Object.assign(market, updateBody);
    await market.save();

    //  User Amount Sync 
    if (updateBody.amount !== undefined && updateBody.amount !== oldAmount) {
        await User.findByIdAndUpdate(
            market.user._id,
            { $inc: { totalMarketAmount: updateBody.amount - oldAmount } }
        );
    }

    return market;
};

/**
 * Delete market by id
 */
const deleteMarketById = async (marketId) => {
    const market = await getMarketById(marketId);
    if (!market) throw new AppError('Market not found', 404);

    await Promise.all([
        User.findByIdAndUpdate(
            market.user._id,
            {
                $pull: { markets: marketId },
                $inc: { totalMarketAmount: -market.amount },
            }
        ),
        Market.findByIdAndDelete(marketId)
    ]);

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
    queryMarkets,
    getMarketById,
    updateMarketById,
    deleteMarketById,
    verifyUserExists,
};