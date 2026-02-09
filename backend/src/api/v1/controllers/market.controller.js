const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { marketService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const pick = require('../../../utils/helpers/pick');

const createMarket = asyncHandler(async (req, res) => {
    const market = await marketService.createMarket({ ...req.body, marketOwner: req.user.id });
    sendSuccessResponse(res, 201, 'Market entry created successfully', market);
});

const getMarkets = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['user', 'date']); // Add relevant filters
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const markets = await marketService.queryMarkets(filter, options);
    sendSuccessResponse(res, 200, 'Market entries retrieved successfully', markets);
});

const getMarket = asyncHandler(async (req, res) => {
    const market = await marketService.getMarketById(req.params.marketId);
    if (!market) {
        return res.status(404).json({ message: 'Market entry not found' });
    }
    sendSuccessResponse(res, 200, 'Market entry details', market);
});

const updateMarket = asyncHandler(async (req, res) => {
    const market = await marketService.updateMarketById(req.params.marketId, req.body);
    sendSuccessResponse(res, 200, 'Market entry updated successfully', market);
});

const deleteMarket = asyncHandler(async (req, res) => {
    // const {marketId} = req.params;
    await marketService.deleteMarketById(req.params.marketId, req.user.id);
    res.status(204).send();
});

module.exports = {
    createMarket,
    getMarkets,
    getMarket,
    updateMarket,
    deleteMarket,
};
