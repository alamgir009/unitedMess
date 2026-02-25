const express = require('express');
const router = express.Router();
const mealController = require('../controllers/meal.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const authenticated = [protect];
const adminOnly = [protect, authorize('admin')];

// Authenticated user routes
router.route('/')
    .get(...authenticated, mealController.getMeals)
    .post(...authenticated, mealController.createMeal);

router.route('/:mealId')
    .get(...authenticated, mealController.getMeal)
    .patch(...authenticated, mealController.updateMeal)
    .delete(...authenticated, mealController.deleteMeal);

// Admin-only routes: manage any user's meals by userId
router.route('/admin/users/:userId/meals')
    .get(...adminOnly, mealController.adminGetUserMeals)
    .post(...adminOnly, mealController.adminCreateMeal);

router.route('/admin/users/:userId/meals/:mealId')
    .patch(...adminOnly, mealController.adminUpdateMeal)
    .delete(...adminOnly, mealController.adminDeleteMeal);

module.exports = router;