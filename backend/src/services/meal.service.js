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
 * Query meals with optional filter & options
 */
// meal.service.js
const queryMeals = async (filter, options = {}, populateUser = false) => {
    let sort = { date: -1 };

    if (options.sortBy) {
        const [field, order] = options.sortBy.split(':');
        sort = { [field]: order === 'asc' ? 1 : -1 };
    }

    const limit = parseInt(options.limit) || 10;
    const page  = parseInt(options.page)  || 1;

    const query = Meal.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    if (populateUser) query.populate('user', 'name email');

    return query;
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
const updateMealById = async (mealId, updateBody) => {
    const meal = await getMealById(mealId);
    if (!meal) throw new AppError('Meal not found', 404);

    // ── 1. Date Logic ─────────────────────────────────────────────────────────────
    if (updateBody.date) {
        const parsedDate = parseDate(updateBody.date);

        if (meal.date.getTime() !== parsedDate.getTime()) {
            const duplicate = await Meal.exists({
                user: meal.user._id,        // populated — must use ._id
                date: parsedDate,
                _id: { $ne: mealId }
            });
            if (duplicate) throw new AppError('A meal already exists for this date', 409);

            updateBody.date = parsedDate;
        } else {
            delete updateBody.date;         // same date from form — skip unnecessary save
        }
    }

    // ── 2. Count Recalculation ────────────────────────────────────────────────────
    const oldMealCount  = meal.mealCount  || 0;
    const oldGuestCount = meal.guestCount || 0;

    if (updateBody.type !== undefined) {
        const resolvedType = updateBody.type ?? meal.type;
        updateBody.mealCount = resolvedType === 'both' ? 2 : 1;
    }

    if (updateBody.isGuestMeal !== undefined || updateBody.guestCount !== undefined) {
        const resolvedIsGuestMeal = updateBody.isGuestMeal ?? meal.isGuestMeal;
        updateBody.guestCount = resolvedIsGuestMeal
            ? (updateBody.guestCount ?? meal.guestCount ?? 1) 
            : 0;
        if (!resolvedIsGuestMeal) updateBody.isGuestMeal = false; // keep flag in sync
    }

    // ── 3. Apply & Save ───────────────────────────────────────────────────────────
    Object.assign(meal, updateBody);
    await meal.save();

    // ── 4. User Stats Sync ────────────────────────────────────────────────────────
    const mealDiff  = (meal.mealCount  || 0) - oldMealCount;
    const guestDiff = (meal.guestCount || 0) - oldGuestCount;

    if (mealDiff !== 0 || guestDiff !== 0) {
        await User.findByIdAndUpdate(
            meal.user._id,                  // populated — must use ._id
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
            meal.user._id,                  // populated — must use ._id
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
    const user = await User.findById(userId).lean();
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