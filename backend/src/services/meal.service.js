const mongoose = require('mongoose');
const Meal = require('../models/Meal.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const { parseDate } = require('../utils/helpers/date.helper');

const mealTypeCountMap = {
  off: 0,
  both: 2,
  day: 1,
  night: 1,
};

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

    mealBody.mealCount = mealTypeCountMap[mealBody.type] ?? 0;
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
// queryMeals in meal.service.js
const queryMeals = async (filter, options = {}, populateUser = false) => {
    let sort = { date: -1 };

    if (options.sortBy) {
        const [field, order] = options.sortBy.split(':');
        sort = { [field]: order === 'asc' ? 1 : -1 };
    }

    const getAll = options.limit === 'all';
    const limit = getAll ? 0 : (parseInt(options.limit) || 10);
    const page  = parseInt(options.page) || 1;
    const skip  = getAll ? 0 : (page - 1) * limit;

    const query = Meal.find(filter).sort(sort);

    if (!getAll) {
        query.skip(skip).limit(limit);
    }
    
    query.lean();

    // In controllers, isAdmin is usually true when we want to populate user
    if (populateUser) query.populate('user', 'name email role');

    const [meals, total] = await Promise.all([
        query.exec(),
        Meal.countDocuments(filter)
    ]);

    const totalPages = getAll ? 1 : Math.ceil(total / limit);

    return {
        meals,
        pagination: {
            page: getAll ? 1 : page,
            limit: getAll ? total : limit,
            total,
            pages: totalPages,
            hasNext: getAll ? false : skip + meals.length < total,
            hasPrev: getAll ? false : page > 1,
            isAll: getAll
        }
    };
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

    // ── 1. Date Validation ───────────────────────────────────────────
    if (updateBody.date) {
        const parsedDate = parseDate(updateBody.date);

        if (meal.date.getTime() !== parsedDate.getTime()) {
            const duplicate = await Meal.exists({
                user: meal.user._id,
                date: parsedDate,
                _id: { $ne: mealId }
            });

            if (duplicate) {
                throw new AppError('A meal already exists for this date', 409);
            }

            updateBody.date = parsedDate;
        } else {
            delete updateBody.date;
        }
    }

    // ── 2. Resolve Final State (safe partial update) ──────────────────
    const finalType = updateBody.type ?? meal.type;
    const finalIsGuestMeal = updateBody.isGuestMeal ?? meal.isGuestMeal;

    let finalGuestCount =
        updateBody.guestCount ?? meal.guestCount ?? 0;

    if (!finalIsGuestMeal) finalGuestCount = 0;

    const finalMealCount = mealTypeCountMap[finalType] ?? 0;

    // ── 3. Preserve old values for diff ───────────────────────────────
    const oldMealCount = meal.mealCount || 0;
    const oldGuestCount = meal.guestCount || 0;

    // ── 4. Apply updates ──────────────────────────────────────────────
    Object.assign(meal, updateBody, {
        type: finalType,
        isGuestMeal: finalIsGuestMeal,
        guestCount: finalGuestCount,
        mealCount: finalMealCount
    });

    await meal.save();

    // ── 5. Sync user stats (only if needed) ───────────────────────────
    const mealDiff = finalMealCount - oldMealCount;
    const guestDiff = finalGuestCount - oldGuestCount;

    if (mealDiff || guestDiff) {
        await User.findByIdAndUpdate(
            meal.user._id,
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