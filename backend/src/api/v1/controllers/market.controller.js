const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { marketService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const pick = require('../../../utils/helpers/pick');
const AppError = require('../../../utils/errors/AppError');

// ─── Authenticated User Controllers ────────────────────────────────────────────

const createMarket = asyncHandler(async (req, res) => {
    const market = await marketService.createMarket({ ...req.body, user: req.user.id });
    sendSuccessResponse(res, 201, 'Market entry created successfully', market);
});

const getMarkets = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['date']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    const isAdmin = req.user.role === 'admin';

    // Non-admin users can only see their own markets
    if (!isAdmin) {
        filter.user = req.user.id;
    }

    // populate only when admin — they need to know which user each market belongs to
    const markets = await marketService.queryMarkets(filter, options, isAdmin);
    sendSuccessResponse(res, 200, 'Market entries retrieved successfully', markets);
});

const getMarket = asyncHandler(async (req, res) => {
    const market = await marketService.getMarketById(req.params.marketId);
    if (!market) throw new AppError('Market entry not found', 404);

    if (req.user.role !== 'admin' && market.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to access this market entry', 403);
    }

    sendSuccessResponse(res, 200, 'Market entry retrieved successfully', market);
});

const updateMarket = asyncHandler(async (req, res) => {
    const market = await marketService.getMarketById(req.params.marketId);
    if (!market) throw new AppError('Market entry not found', 404);

    if (req.user.role !== 'admin' && market.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to update this market entry', 403);
    }

    const updatedMarket = await marketService.updateMarketById(req.params.marketId, req.body);
    sendSuccessResponse(res, 200, 'Market entry updated successfully', updatedMarket);
});

const deleteMarket = asyncHandler(async (req, res) => {
    const market = await marketService.getMarketById(req.params.marketId);
    if (!market) throw new AppError('Market entry not found', 404);

    if (req.user.role !== 'admin' && market.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to delete this market entry', 403);
    }

    await marketService.deleteMarketById(req.params.marketId);
    res.status(204).send();
});

// ─── Admin Controllers ──────────────────────────────────────────────────────────

const adminGetUserMarkets = asyncHandler(async (req, res) => {
    await marketService.verifyUserExists(req.params.userId);

    const filter = {
        ...pick(req.query, ['date']),
        user: req.params.userId,  // always lock to the userId in URL
    };
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    const markets = await marketService.queryMarkets(filter, options);
    sendSuccessResponse(res, 200, 'User market entries retrieved successfully', markets);
});

const adminCreateMarket = asyncHandler(async (req, res) => {
    await marketService.verifyUserExists(req.params.userId);

    const market = await marketService.createMarket({ ...req.body, user: req.params.userId });
    sendSuccessResponse(res, 201, 'Market entry created successfully for user', market);
});

const adminUpdateMarket = asyncHandler(async (req, res) => {
    await marketService.verifyUserExists(req.params.userId);

    const market = await marketService.getMarketById(req.params.marketId);
    if (!market) throw new AppError('Market entry not found', 404);

    if (market.user._id.toString() !== req.params.userId) {
        throw new AppError('Market entry does not belong to this user', 400);
    }

    const updatedMarket = await marketService.updateMarketById(req.params.marketId, req.body);
    sendSuccessResponse(res, 200, 'Market entry updated successfully', updatedMarket);
});

const adminDeleteMarket = asyncHandler(async (req, res) => {
    await marketService.verifyUserExists(req.params.userId);

    const market = await marketService.getMarketById(req.params.marketId);
    if (!market) throw new AppError('Market entry not found', 404);

    if (market.user._id.toString() !== req.params.userId) {
        throw new AppError('Market entry does not belong to this user', 400);
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
    adminGetUserMarkets,
    adminCreateMarket,
    adminUpdateMarket,
    adminDeleteMarket,
};