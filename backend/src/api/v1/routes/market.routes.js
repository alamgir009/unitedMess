const express = require('express');
const router = express.Router();
const marketController = require('../controllers/market.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const authenticated = [protect];
const adminOnly = [protect, authorize('admin')];

// Authenticated user routes
router.route('/')
    .get(...authenticated, marketController.getMarkets)
    .post(...authenticated, marketController.createMarket);

router.route('/:marketId')
    .get(...authenticated, marketController.getMarket)
    .patch(...authenticated, marketController.updateMarket)
    .delete(...authenticated, marketController.deleteMarket);

// Admin-only routes: manage any user's markets by userId
router.route('/admin/users/:userId/markets')
    .get(...adminOnly, marketController.adminGetUserMarkets)
    .post(...adminOnly, marketController.adminCreateMarket);

router.route('/admin/users/:userId/markets/:marketId')
    .patch(...adminOnly, marketController.adminUpdateMarket)
    .delete(...adminOnly, marketController.adminDeleteMarket);

module.exports = router;