const Market = require('../models/Market.model');
const User = require('../models/User.model');

/**
 * Create a market entry
 * @param {Object} marketBody
 * @returns {Promise<Market>}
 */
const createMarket = async (marketBody) => {
    const {user} = marketBody;
    let newMarket = await Market.create(marketBody)

    await User.findByIdAndUpdate(user,{
        $push:{markets:newMarket._id}}, 
    {new:true})

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
    if (!market) {
        throw new Error('Market not found');
    }
    Object.assign(market, updateBody);
    await market.save();
    return market;
};

/**
 * Delete market by id
 * @param {ObjectId} marketId
 * @returns {Promise<Market>}
 */
const deleteMarketById = async (marketId,userId) => {
    const market = await getMarketById(marketId);
    if (!market) {
        throw new Error('Market not found');
    }
    await market.remove();

    await User.findByIdAndUpdate(userId,{
        $pull:{markets:marketId}
    })
    return market;
};

module.exports = {
    createMarket,
    queryMarkets,
    getMarketById,
    updateMarketById,
    deleteMarketById,
};
