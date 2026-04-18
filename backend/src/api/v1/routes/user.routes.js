const express = require('express');
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

const router = express.Router();

// Helper to apply middleware chain
const adminOnly = [protect, authorize('admin')];
const authenticated = [protect];

// ==================== SEARCH & STATS (Admin Only) ====================
router.get('/search', ...adminOnly, userController.searchUsers);
router.get('/stats', ...adminOnly, userController.getStats);
router.get('/stats/market-grand-total', ...adminOnly, userController.getGrandTotalMarketAmount);
router.get('/stats/meal-grand-total', ...adminOnly, userController.getGrandTotalMeal);
router.get('/stats/meal-charge', ...adminOnly, userController.getMealCharge);

// Bulk operations
router.patch('/bulk/status', ...adminOnly, userController.bulkUpdateStatus);

// ==================== CURRENT USER (Me) ====================
router.route('/me')
.get(...authenticated, userController.getMe)
.patch(...authenticated, userController.updateMe)
.delete(...authenticated, userController.deactivateMyAccount);

router.patch('/me/avatar', ...authenticated, upload.single('image'), userController.updateAvatar);
router.get('/me/payable', ...authenticated, userController.getPaybleAmountforMeal);
router.get('/me/payable/gasbill', ...authenticated, userController.getPaybleAmountforGasBill);

// ==================== USER MANAGEMENT (Admin Only for modifications, Authenticated for viewing) ====================
router.route('/')
    .get(...authenticated, userController.getUsers)

// Specific actions before generic routes
router.post('/:userId/approve', ...adminOnly, userController.approveUser);
router.post('/:userId/deny', ...adminOnly, userController.denyUser);
router.patch('/:userId/payment', ...adminOnly, userController.updatePaymentStatus);
router.patch('/:userId/gas-bill', ...adminOnly, userController.updateGasBillStatus);
router.get('/:userId/payable', ...adminOnly, userController.getPaybleAmountforMeal);
router.get('/:userId/payable/gasbill', ...adminOnly, userController.getPaybleAmountforGasBill);

// Generic CRUD (must be last)
router.route('/:userId')
    .get(...adminOnly, userController.getUser)
    .patch(...adminOnly, userController.updateUser)
    .delete(...adminOnly, userController.deleteUser);

module.exports = router;