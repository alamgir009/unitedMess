const mongoose = require('mongoose');
const Meal = require('../models/Meal.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const { parseDate } = require('../utils/helpers/date.helper');

/**
 * Create a meal
 */
const createMeal = async (mealBody) => {
    const { user } = mealBody;
    const date = parseDate(mealBody.date);
    mealBody.date = date;

    if (await Meal.exists({ user, date })) {
        throw new AppError('Meal already exists for this date', 409);
    }

    mealBody.mealCount = mealBody.type === 'both' ? 2 : 1;
    mealBody.guestCount = mealBody.isGuestMeal ? (mealBody.guestCount || 1) : 0;

    const mealId = new mongoose.Types.ObjectId();
    mealBody._id = mealId;

    const [newMeal] = await Promise.all([
        Meal.create(mealBody),
        User.findByIdAndUpdate(
            user,
            {
                $push: { meals: mealId },
                $inc: { totalMeal: mealBody.mealCount, guestMeal: mealBody.guestCount }
            },
            { new: true, runValidators: true }
        )
    ]);

    return newMeal;
};

/**
 * Query meals by filter
 */
const queryMeals = async (filter, options) => {
    let sort = { date: -1 }; // default

    if (options?.sortBy) {
        const [field, order] = options.sortBy.split(':');
        sort = { [field]: order === 'asc' ? 1 : -1 };
    }

    const limit = parseInt(options?.limit) || 10;
    const page = parseInt(options?.page) || 1;

    return Meal.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
};

/**
 * Get meal by id
 */
const getMealById = async (id) => {
    return Meal.findById(id).populate('user', 'name email');
};

/**
 * Update meal by id
 */
/**
 * Update meal by id with duplicate date check
 */
const updateMealById = async (mealId, updateBody) => {
    const meal = await getMealById(mealId);
    if (!meal) throw new AppError('Meal not found', 404);

    //  1. Date Logic
    if (updateBody.date) {
        const parsedDate = parseDate(updateBody.date);

        if (meal.date.getTime() !== parsedDate.getTime()) {
            // Date actually changed — check for duplicate
            const duplicate = await Meal.exists({
                user: meal.user._id,   // meal.user is populated (object), use ._id
                date: parsedDate,
                _id: { $ne: mealId }
            });
            if (duplicate) throw new AppError('A meal already exists for this date', 409);

            updateBody.date = parsedDate;
        } else {
            // Same date sent from form — skip it entirely
            delete updateBody.date;
        }
    }

    // 2. Count Recalculation 
    const oldMealCount = meal.mealCount || 0;
    const oldGuestCount = meal.guestCount || 0;

    // Resolve final type (incoming or existing)
    const resolvedType = updateBody.type ?? meal.type;
    if (updateBody.type !== undefined) {
        updateBody.mealCount = resolvedType === 'both' ? 2 : 1;
    }

    // Resolve final guest state (incoming or existing)
    const resolvedIsGuestMeal = updateBody.isGuestMeal ?? meal.isGuestMeal;
    if (updateBody.isGuestMeal !== undefined || updateBody.guestCount !== undefined) {
        updateBody.guestCount = resolvedIsGuestMeal
            ? (updateBody.guestCount ?? meal.guestCount ?? 1)
            : 0;
        // Keep isGuestMeal in sync if guestCount is being zeroed
        if (!resolvedIsGuestMeal) updateBody.isGuestMeal = false;
    }

    // 3. Apply & Save 
    Object.assign(meal, updateBody);
    await meal.save();

    // 4. User Stats Sync (only if counts actually changed) 
    const mealDiff = (meal.mealCount || 0) - oldMealCount;
    const guestDiff = (meal.guestCount || 0) - oldGuestCount;

    if (mealDiff !== 0 || guestDiff !== 0) {
        await User.findByIdAndUpdate(
            meal.user._id,  // populated object — always use ._id
            { $inc: { totalMeal: mealDiff, guestMeal: guestDiff } }
        );
    }

    return meal;
};

/**
 * Delete meal by id
 */
const deleteMealById = async (mealId) => {
    const meal = await getMealById(mealId);
    if (!meal) throw new AppError('Meal not found', 404);

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

/**
 * Admin: verify a user exists
 */
const verifyUserExists = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
};

module.exports = {
    createMeal,
    queryMeals,
    getMealById,
    updateMealById,
    deleteMealById,
    verifyUserExists,
};