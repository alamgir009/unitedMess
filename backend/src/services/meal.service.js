const Meal = require('../models/Meal.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');

/**
 * Create a meal
 * @param {Object} mealBody
 * @returns {Promise<Meal>}
 */
const createMeal = async (mealBody) => {
    const { user, date } = mealBody;
    mealBody.mealCount = mealBody.type === 'both' ? 2 : 1;

    const existingMeal = await Meal.findOne({ user, date })
    if (existingMeal) throw new AppError('Meal already exist for this date', 409)

    const newMeal = await Meal.create(mealBody);
    await User.findByIdAndUpdate(user, {
        $push: { meals: newMeal._id },
        $inc: { totalMeal: newMeal.mealCount }
    },
        { new: true, runValidators: true })
    return newMeal;

};

/**
 * Query for meals
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryMeals = async (filter, options) => {
    const meals = await Meal.find(filter).sort({ date: -1 });
    return meals;
};

/**
 * Get meal by id
 * @param {ObjectId} id
 * @returns {Promise<Meal>}
 */
const getMealById = async (id) => {
    return Meal.findById(id);
};

/**
 * Update meal by id
 * @param {ObjectId} mealId
 * @param {Object} updateBody
 * @returns {Promise<Meal>}
 */
const updateMealById = async (mealId, updateBody) => {
    const meal = await getMealById(mealId);
    if (!meal) throw new AppError('Meal not found', 404);

    const oldCount = meal.mealCount;
    // If type is being updated, recalc mealCount
    if (updateBody.type) {
        updateBody.mealCount = updateBody.type === 'both' ? 2 : 1;
    }

    Object.assign(meal, updateBody);
    await meal.save();

    // Adjust user's total if mealCount changed
    if (updateBody.mealCount !== undefined && meal.mealCount !== oldCount) {
        await User.findByIdAndUpdate(meal.user, {
            $inc: { totalMeal: meal.mealCount - oldCount }
        },
        { new: true, runValidators: true });
    }

    return meal;
};

/**
 * Delete meal by id
 * @param {ObjectId} mealId
 * @returns {Promise<Meal>}
 */
const deleteMealById = async (mealId) => {
    const meal = await getMealById(mealId);
    if (!meal) {
        throw new AppError('Meal not found', 404);
    }

    await User.findByIdAndUpdate(meal.user, {
        $pull: { meals: mealId },
        $inc: { totalMeal: -meal.mealCount }
    },
    { new: true, runValidators: true })
    
    await Meal.findByIdAndDelete(mealId);
    return meal;
};

module.exports = {
    createMeal,
    queryMeals,
    getMealById,
    updateMealById,
    deleteMealById,
};
