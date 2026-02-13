const express = require('express');
const settingsController = require('../controllers/setting.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.patch('/guest-meal-charge', authorize('admin'), settingsController.updateGuestMealCharge);
router.patch('/cooking-charge', authorize('admin'), settingsController.updateCookingCharge);
router.patch('/water-bill', authorize('admin'), settingsController.updateWaterBill);
router.patch('/gas-bill', authorize('admin'), settingsController.updateGasBillCharge);

module.exports = router;