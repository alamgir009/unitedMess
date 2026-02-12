const Market = require('../models/Market.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');

/**
 * Create a market entry
 * @param {Object} marketBody
 * @returns {Promise<Market>}
 */
const createMarket = async (marketBody) => {
    const { user, date } = marketBody;
    const existingMarket = await Market.findOne({ user, date });

    if (existingMarket) {
        throw new AppError('Market already exists for this date', 409);
    }
    let newMarket = await Market.create(marketBody)

    await User.findByIdAndUpdate(user, {
        $push: { markets: newMarket._id },
        $inc: { totalMarketAmount: newMarket.amount }
    },
    { new: true, runValidators: true })

    return newMarket
};

/**
 * Query for markets
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const queryMarkets = async (filter, options) => {
    const markets = await Market.find(filter).sort({ date: -1 }).populate('user', 'name email');
    return markets;
};

/**
 * Get market by id
 * @param {ObjectId} id
 * @returns {Promise<Market>}
 */
const getMarketById = async (id) => {
    return Market.findById(id).populate('user', 'name email');
};

/**
 * Update market by id
 * @param {ObjectId} marketId
 * @param {Object} updateBody
 * @returns {Promise<Market>}
 */
const updateMarketById = async (marketId, updateBody) => {
    const market = await getMarketById(marketId);
    if (!market) throw new AppError('Market not found', 404);

    const oldAmount = market.amount;
    Object.assign(market, updateBody);
    await market.save();

    // Adjust user's total if amount changed
    if (updateBody.amount !== undefined && updateBody.amount !== oldAmount) {
        await User.findByIdAndUpdate(market.user._id, {
            $inc: { totalMarketAmount: updateBody.amount - oldAmount }
        },
        { new: true, runValidators: true });
    }

    return market;
};

/**
 * Delete market by id
 * @param {ObjectId} marketId
 * @returns {Promise<Market>}
 */
const deleteMarketById = async (marketId) => {
    const market = await getMarketById(marketId);
    if (!market) {
        throw new AppError('Market not found', 404);
    }
    
    await User.findByIdAndUpdate(market.user, {
        $pull: { markets: marketId },
        $inc: { totalMarketAmount: -market.amount }
    },
    { new: true, runValidators: true })
    
    await Market.findByIdAndDelete(marketId)
    return market;
};

module.exports = {
    createMarket,
    queryMarkets,
    getMarketById,
    updateMarketById,
    deleteMarketById,
};
