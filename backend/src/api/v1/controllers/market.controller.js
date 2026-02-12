const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { marketService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const pick = require('../../../utils/helpers/pick');
const AppError = require('../../../utils/errors/AppError');

const createMarket = asyncHandler(async (req, res) => {
    const market = await marketService.createMarket({ ...req.body, user: req.user.id });
    sendSuccessResponse(res, 201, 'Market entry created successfully', market);
});

const getMarkets = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['user', 'date']); // Add relevant filters

    // If not admin, force filter by current user
    if (req.user.role !== 'admin') {
        filter.user = req.user.id;
    }

    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const markets = await marketService.queryMarkets(filter, options);
    sendSuccessResponse(res, 200, 'Market entries retrieved successfully', markets);
});

const getMarket = asyncHandler(async (req, res) => {
    const market = await marketService.getMarketById(req.params.marketId);
    if (!market) {
        throw new AppError('Market entry not found', 404);
    }

    // Check permission
    if (req.user.role !== 'admin' && market.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to access this market entry', 403);
    }

    sendSuccessResponse(res, 200, 'Market entry details', market);
});

const updateMarket = asyncHandler(async (req, res) => {
    const market = await marketService.getMarketById(req.params.marketId);
    if (!market) {
        throw new AppError('Market entry not found', 404);
    }

    // Check permission
    if (req.user.role !== 'admin' && market.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to update this market entry', 403);
    }

    const updatedMarket = await marketService.updateMarketById(req.params.marketId, req.body);
    sendSuccessResponse(res, 200, 'Market entry updated successfully', updatedMarket);
});

const deleteMarket = asyncHandler(async (req, res) => {
    const market = await marketService.getMarketById(req.params.marketId);
    if (!market) {
        throw new AppError('Market entry not found', 404);
    }

    // Check permission
    if (req.user.role !== 'admin' && market.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to delete this market entry', 403);
    }

    await marketService.deleteMarketById(req.params.marketId);
    res.status(204).send();
});

module.exports = {
    createMarket,
    getMarkets,
    getMarket,
    updateMarket,
    deleteMarket,
};
