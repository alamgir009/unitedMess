const express = require('express');
const router = express.Router();
const marketController = require('../controllers/market.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/')
    .get(marketController.getMarkets)
    .post(marketController.createMarket);

router.route('/:marketId')
    .get(marketController.getMarket)
    .patch(marketController.updateMarket)
    .delete(marketController.deleteMarket);

module.exports = router;
