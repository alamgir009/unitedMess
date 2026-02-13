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

    // Check for existing meal first (fail fast)
    if (await Meal.exists({ user, date })) {
        throw new AppError('Meal already exists for this date', 409);
    }

    // Set counts
    mealBody.mealCount = mealBody.type === 'both' ? 2 : 1;
    mealBody.guestCount = mealBody.isGuestMeal ? (mealBody.guestCount || 1) : 0;

    // Parallel execution for better performance
    const [newMeal] = await Promise.all([
        Meal.create(mealBody),
        User.findByIdAndUpdate(
            user,
            {
                $push: { meals: mealBody._id }, // Will be set by Mongoose
                $inc: {
                    totalMeal: mealBody.mealCount,
                    guestMeal: mealBody.guestCount
                }
            },
            { new: true, runValidators: true }
        )
    ]);

    return newMeal;
};

/**
 * Query for meals
 * @param {Object} filter
 * @returns {Promise<QueryResult>}
 */
const queryMeals = async (filter) => {
    return Meal.find(filter).sort({ date: -1 }).lean(); // .lean() for 5-10x faster queries
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

    // Store old values
    const oldMealCount = meal.mealCount;
    const oldGuestCount = meal.guestCount || 0;

    // Handle type change
    if (updateBody.type) {
        updateBody.mealCount = updateBody.type === 'both' ? 2 : 1;
    }

    // Handle guest meal toggle
    if (updateBody.isGuestMeal !== undefined) {
        updateBody.guestCount = updateBody.isGuestMeal 
            ? (updateBody.guestCount ?? 1) 
            : 0;
    }

    // Apply updates
    Object.assign(meal, updateBody);
    await meal.save();

    // Calculate diffs
    const mealDiff = meal.mealCount - oldMealCount;
    const guestDiff = (meal.guestCount || 0) - oldGuestCount;

    // Update user if needed
    if (mealDiff || guestDiff) {
        await User.findByIdAndUpdate(
            meal.user,
            { $inc: { totalMeal: mealDiff, guestMeal: guestDiff } },
            { new: true }
        );
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
    if (!meal) throw new AppError('Meal not found', 404);

    // Parallel execution
    await Promise.all([
        User.findByIdAndUpdate(
            meal.user,
            {
                $pull: { meals: mealId },
                $inc: { totalMeal: -meal.mealCount, guestMeal: -(meal.guestCount || 0) }
            }
        ),
        meal.deleteOne()
    ]);

    return meal;
};

module.exports = {
    createMeal,
    queryMeals,
    getMealById,
    updateMealById,
    deleteMealById,
};
