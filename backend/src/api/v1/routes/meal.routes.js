const express = require('express');
const router = express.Router();
const mealController = require('../controllers/meal.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/')
    .get(mealController.getMeals)
    .post(mealController.createMeal);

router.route('/:mealId')
    .get(mealController.getMeal)
    .patch(mealController.updateMeal)
    .delete(mealController.deleteMeal);

module.exports = router;
