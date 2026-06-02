const express = require('express');
const router = express.Router();
const mealController = require('../controllers/meal.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const authenticated = [protect];
const adminOnly    = [protect, authorize('admin')];

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Static + prefixed routes MUST be registered before the dynamic
// /:mealId wildcard, otherwise Express will treat "poll" and "admin" as mealId
// values and the handlers below will never be reached.
// ─────────────────────────────────────────────────────────────────────────────

// ── Polling routes ────────────────────────────────────────────────────────────
router.post('/poll/vote',   ...authenticated, mealController.voteMealPoll);
router.get('/poll/status',  ...authenticated, mealController.getMealPollStatus);

// ── Bulk meal creation ────────────────────────────────────────────────────────
router.post('/bulk', ...authenticated, mealController.bulkCreateMeals);

// ── Bulk meal deletion ────────────────────────────────────────────────────────
router.post('/bulk-delete', ...authenticated, mealController.bulkDeleteMeals);

// ── Admin-only routes: manage any user's meals ────────────────────────────────
router.route('/admin/users/:userId/meals')
    .get( ...adminOnly, mealController.adminGetUserMeals)
    .post(...adminOnly, mealController.adminCreateMeal);

router.route('/admin/users/:userId/meals/:mealId')
    .patch( ...adminOnly, mealController.adminUpdateMeal)
    .delete(...adminOnly, mealController.adminDeleteMeal);

// ── Authenticated user routes (collection) ────────────────────────────────────
router.route('/')
    .get( ...authenticated, mealController.getMeals)
    .post(...authenticated, mealController.createMeal);

// ── Authenticated user routes (single resource) ───────────────────────────────
// NOTE: Must come AFTER all static-prefix routes above.
router.route('/:mealId')
    .get(   ...authenticated, mealController.getMeal)
    .patch( ...authenticated, mealController.updateMeal)
    .delete(...authenticated, mealController.deleteMeal);

module.exports = router;