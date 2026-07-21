const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { marketService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const pick = require('../../../utils/helpers/pick');
const AppError = require('../../../utils/errors/AppError');
const { getVisibleBillingStartDate } = require('../../../utils/helpers/date.helper');

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

    // Support explicit date range (used by the calendar view)
    // When startDate/endDate are provided, they override the billing-start-date default
    // so that navigating to any past month returns the correct data.
    if (req.query.startDate || req.query.endDate) {
        filter.date = {};
        if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
        if (req.query.endDate)   filter.date.$lte = new Date(req.query.endDate);
    } else if (!filter.date && !(isAdmin && req.query.allHistory === 'true')) {
        filter.date = { $gte: getVisibleBillingStartDate() };
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

const getMarketSchedule = asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const schedule = await marketService.generateMonthlySchedule(year, month);
    sendSuccessResponse(res, 200, 'Market schedule retrieved successfully', schedule);
});

// ─── Admin Bulk Controller ─────────────────────────────────────────────────────

const bulkCreateMarkets = asyncHandler(async (req, res) => {
    const { userIds, date, amount, items, description } = req.body;

    if (!date) {
        throw new AppError('date is required', 400);
    }

    if (amount === undefined || amount === null) {
        throw new AppError('amount is required', 400);
    }

    if (!items || typeof items !== 'string' || !items.trim()) {
        throw new AppError('items is required', 400);
    }

    const isAdmin = req.user.role === 'admin';
    const targetUsers = isAdmin && userIds?.length > 0 ? userIds : [req.user.id];

    const result = await marketService.bulkCreateMarkets({
        userIds: targetUsers,
        date,
        amount,
        items,
        description: description || '',
    });

    const message = result.inserted > 0
        ? `Successfully added ${result.inserted} market entry/entries, ${result.skipped} already existed`
        : `All ${result.skipped} market entry/entries already existed`;

    sendSuccessResponse(res, 201, message, result);
});

// ─── Admin Controllers ──────────────────────────────────────────────────────────

const adminGetUserMarkets = asyncHandler(async (req, res) => {
    await marketService.verifyUserExists(req.params.userId);

    const filter = {
        ...pick(req.query, ['date']),
        user: req.params.userId,  // always lock to the userId in URL
    };
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    // Apply 10th-day visual reset rule if not fetching all history
    if (!filter.date && req.query.allHistory !== 'true') {
        filter.date = { $gte: getVisibleBillingStartDate() };
    }

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
    bulkCreateMarkets,
    getMarkets,
    getMarket,
    updateMarket,
    deleteMarket,
    adminGetUserMarkets,
    adminCreateMarket,
    adminUpdateMarket,
    adminDeleteMarket,
    getMarketSchedule,
};