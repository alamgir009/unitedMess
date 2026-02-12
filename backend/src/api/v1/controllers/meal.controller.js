const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { mealService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const pick = require('../../../utils/helpers/pick');

const createMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.createMeal({ ...req.body, user: req.user.id });
    sendSuccessResponse(res, 201, 'Meal created successfully', meal);
});

const getMeals = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['user', 'date']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    // If not admin, maybe restrict? For now, we allow seeing all.
    // If we want to filter specific date logic, we can add it here.

    const meals = await mealService.queryMeals(filter, options);
    sendSuccessResponse(res, 200, 'Meals retrieved successfully', meals);
});

const getMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.getMealById(req.params.mealId);
    if (!meal) {
        return res.status(404).json({ message: 'Meal not found' });
    }
    sendSuccessResponse(res, 200, 'Meal details', meal);
});

const updateMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.updateMealById(req.params.mealId, req.body);
    sendSuccessResponse(res, 200, 'Meal updated successfully', meal);
});

const deleteMeal = asyncHandler(async (req, res) => {
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
