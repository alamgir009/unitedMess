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

    // Validate required items (must be non‑empty string)
    if (!items || typeof items !== 'string' || !items.trim()) {
        throw new AppError('Items description is required and must be a non‑empty string', 400);
    }

    // Prevent duplicate entry for same user & date
    const existingMarket = await Market.findOne({ user, date });
    if (existingMarket) {
        throw new AppError('Market already exists for this date', 409);
    }

    const marketId = new mongoose.Types.ObjectId();

    // Prepare market data exactly matching the schema
    const marketData = {
        _id: marketId,
        user,
        date,
        amount,
        items: items.trim(),
        ...(description && { description }),
        ...(image && { image }),
    };

    // Parallel: create market + update user totals
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
 * Query for markets (with optional filters)
 */
const queryMarkets = async (filter, options) => {
    const markets = await Market.find(filter)
        .sort({ date: -1 })
        .populate('user', 'name email');
    return markets;
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

    // Parse date if present
    if (updateBody.date) {
        updateBody.date = parseDate(updateBody.date);
    }

    // Trim items if provided
    if (updateBody.items && typeof updateBody.items === 'string') {
        updateBody.items = updateBody.items.trim();
    }

    Object.assign(market, updateBody);
    await market.save();

    // Adjust user's total if amount changed
    if (updateBody.amount !== undefined && updateBody.amount !== oldAmount) {
        await User.findByIdAndUpdate(
            market.user._id,
            { $inc: { totalMarketAmount: updateBody.amount - oldAmount } },
            { new: true, runValidators: true }
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

    await User.findByIdAndUpdate(
        market.user,
        {
            $pull: { markets: marketId },
            $inc: { totalMarketAmount: -market.amount },
        },
        { new: true, runValidators: true }
    );

    await Market.findByIdAndDelete(marketId);
    return market;
};

module.exports = {
    createMarket,
    queryMarkets,
    getMarketById,
    updateMarketById,
    deleteMarketById,
};