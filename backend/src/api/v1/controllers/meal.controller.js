const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { mealService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const pick = require('../../../utils/helpers/pick');
const AppError = require('../../../utils/errors/AppError');

// ─── Authenticated User Controllers ────────────────────────────────────────────

const createMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.createMeal({ ...req.body, user: req.user.id });
    sendSuccessResponse(res, 201, 'Meal created successfully', meal);
});

const getMeals = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['user', 'date']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    // Non-admin users can only see their own meals
    if (req.user.role !== 'admin') {
        filter.user = req.user.id;
    }

    const meals = await mealService.queryMeals(filter, options);
    sendSuccessResponse(res, 200, 'Meals retrieved successfully', meals);
});

const getMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.getMealById(req.params.mealId);
    if (!meal) throw new AppError('Meal not found', 404);

    if (req.user.role !== 'admin' && meal.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to access this meal', 403);
    }

    sendSuccessResponse(res, 200, 'Meal retrieved successfully', meal);
});

const updateMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.getMealById(req.params.mealId);
    if (!meal) throw new AppError('Meal not found', 404);

    if (req.user.role !== 'admin' && meal.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to update this meal', 403);
    }

    const updatedMeal = await mealService.updateMealById(req.params.mealId, req.body);
    sendSuccessResponse(res, 200, 'Meal updated successfully', updatedMeal);
});

const deleteMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.getMealById(req.params.mealId);
    if (!meal) throw new AppError('Meal not found', 404);

    if (req.user.role !== 'admin' && meal.user._id.toString() !== req.user.id) {
        throw new AppError('You do not have permission to delete this meal', 403);
    }

    await mealService.deleteMealById(req.params.mealId);
    res.status(204).send();
});

// ─── Admin Controllers ──────────────────────────────────────────────────────────

const adminGetUserMeals = asyncHandler(async (req, res) => {
    await mealService.verifyUserExists(req.params.userId);

    const filter = { 
        ...pick(req.query, ['date']), 
        user: req.params.userId 
    };
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    const meals = await mealService.queryMeals(filter, options);
    sendSuccessResponse(res, 200, 'User meals retrieved successfully', meals);
});

const adminCreateMeal = asyncHandler(async (req, res) => {
    await mealService.verifyUserExists(req.params.userId);

    const meal = await mealService.createMeal({ ...req.body, user: req.params.userId });
    sendSuccessResponse(res, 201, 'Meal created successfully for user', meal);
});

const adminUpdateMeal = asyncHandler(async (req, res) => {
    await mealService.verifyUserExists(req.params.userId);

    const meal = await mealService.getMealById(req.params.mealId);
    if (!meal) throw new AppError('Meal not found', 404);

    if (meal.user._id.toString() !== req.params.userId) {
        throw new AppError('Meal does not belong to this user', 400);
    }

    const updatedMeal = await mealService.updateMealById(req.params.mealId, req.body);
    sendSuccessResponse(res, 200, 'Meal updated successfully', updatedMeal);
});

const adminDeleteMeal = asyncHandler(async (req, res) => {
    await mealService.verifyUserExists(req.params.userId);

    const meal = await mealService.getMealById(req.params.mealId);
    if (!meal) throw new AppError('Meal not found', 404);

    if (meal.user._id.toString() !== req.params.userId) {
        throw new AppError('Meal does not belong to this user', 400);
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
    adminGetUserMeals,
    adminCreateMeal,
    adminUpdateMeal,
    adminDeleteMeal,
};