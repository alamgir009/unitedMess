const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { mealService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const pick = require('../../../utils/helpers/pick');
const AppError = require('../../../utils/errors/AppError');

const createMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.createMeal({ ...req.body, user: req.user.id });
    sendSuccessResponse(res, 201, 'Meal created successfully', meal);
});

const getMeals = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['user', 'date']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    // If not admin, restrict to own meals
    if (req.user.role !== 'admin') {
        filter.user = req.user.id;
    }

    const meals = await mealService.queryMeals(filter, options);
    sendSuccessResponse(res, 200, 'Meals retrieved successfully', meals);
});

const getMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.getMealById(req.params.mealId);
    if (!meal) {
        throw new AppError('Meal not found', 404);
    }

    // Check permission
    if (req.user.role !== 'admin' && meal.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to access this meal', 403);
    }

    sendSuccessResponse(res, 200, 'Meal details', meal);
});

const updateMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.getMealById(req.params.mealId);
    if (!meal) {
        throw new AppError('Meal not found', 404);
    }

    // Check permission
    if (req.user.role !== 'admin' && meal.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to update this meal', 403);
    }

    const updatedMeal = await mealService.updateMealById(req.params.mealId, req.body);
    sendSuccessResponse(res, 200, 'Meal updated successfully', updatedMeal);
});

const deleteMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.getMealById(req.params.mealId);
    if (!meal) {
        throw new AppError('Meal not found', 404);
    }

    // Check permission
    if (req.user.role !== 'admin' && meal.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to delete this meal', 403);
    }

    await mealService.deleteMealById(req.params.mealId);
    res.status(204).send();
});

module.exports = {
    createMeal,
    getMeals,
    getMeal,
    updateMeal,
    deleteMeal,
};
