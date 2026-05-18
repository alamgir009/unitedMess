const mongoose = require('mongoose');
const Meal = require('../models/Meal.model');
const MealPoll = require('../models/MealPoll.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const { parseDate } = require('../utils/helpers/date.helper');

const mealTypeCountMap = {
  off: 0,
  both: 2,
  day: 1,
  night: 1,
};

const MAX_BULK_DAYS = 31;
const MAX_USER_MEALS = 200;

/**
 * Bulk create meals for date range and multiple users
 */
const bulkCreateMeals = async ({ startDate, endDate, type, userIds, isGuestMeal, guestCount, remarks, createdBy }) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (start > end) {
    throw new AppError('Start date must be on or before end date', 400);
  }

  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  if (daysDiff > MAX_BULK_DAYS) {
    throw new AppError(`Maximum range is ${MAX_BULK_DAYS} days`, 400);
  }

  if (!userIds || userIds.length === 0) {
    throw new AppError('At least one user must be selected', 400);
  }

  const mealCount = mealTypeCountMap[type] ?? 0;
  const guestAdd = isGuestMeal ? (guestCount || 0) : 0;
  const totalMealCount = mealCount + guestAdd;

  const users = await User.find({ _id: { $in: userIds } }).select('_id meals').lean();
  if (users.length !== userIds.length) {
    throw new AppError('One or more users not found', 404);
  }

  for (const user of users) {
    if ((user.meals?.length || 0) + daysDiff > MAX_USER_MEALS) {
      throw new AppError(`User ${user._id} would exceed maximum meal records (${MAX_USER_MEALS})`, 400);
    }
  }

  const dates = [];
  for (let i = 0; i < daysDiff; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i));
    dates.push(d);
  }

  const existingMeals = await Meal.find({
    user: { $in: userIds },
    date: { $in: dates },
    type,
  }).select('user date type').lean();

  const existingSet = new Set(
    existingMeals.map(m => `${m.user.toString()}-${m.date.getTime()}-${m.type}`)
  );

  const insertOps = [];
  const userMealMap = {};
  const userGuestMap = {};
  const userMealIds = {};

  for (const uid of userIds) {
    userMealMap[uid] = 0;
    userGuestMap[uid] = 0;
    userMealIds[uid] = [];

    for (const d of dates) {
      const key = `${uid}-${d.getTime()}-${type}`;
      if (existingSet.has(key)) continue;

      const mealId = new mongoose.Types.ObjectId();
      insertOps.push({
        insertOne: {
          document: {
            _id: mealId,
            user: uid,
            date: d,
            type,
            mealCount: totalMealCount,
            isGuestMeal: isGuestMeal || false,
            guestCount: guestAdd,
            remarks: remarks || '',
          },
        },
      });

      userMealIds[uid].push(mealId);
      userMealMap[uid] += mealCount;
      userGuestMap[uid] += guestAdd;
    }
  }

  let insertedCount = 0;
  let skippedCount = existingMeals.length;

  if (insertOps.length > 0) {
    const bulkResult = await Meal.bulkWrite(insertOps, { ordered: false });
    insertedCount = bulkResult.insertedCount || 0;
  }

  const userUpdateOps = [];
  for (const uid of userIds) {
    const mealInc = userMealMap[uid];
    const guestInc = userGuestMap[uid];
    const mealIds = userMealIds[uid];
    if (mealInc > 0 || guestInc > 0) {
      userUpdateOps.push({
        updateOne: {
          filter: { _id: uid },
          update: {
            $push: { meals: { $each: mealIds } },
            $inc: { totalMeal: mealInc, guestMeal: guestInc },
          },
        },
      });
    }
  }

  if (userUpdateOps.length > 0) {
    await User.bulkWrite(userUpdateOps);
  }

  return {
    inserted: insertedCount,
    skipped: skippedCount,
    total: userIds.length * daysDiff,
  };
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
    const limit  = getAll ? 0 : (parseInt(options.limit) || 10);
    const page   = parseInt(options.page) || 1;
    const skip   = getAll ? 0 : (page - 1) * limit;

    // Use `let` so we can chain modifiers onto the query incrementally
    // without hitting "Assignment to constant variable".
    let query = Meal.find(filter).sort(sort);

    if (!getAll) {
        query = query.skip(skip).limit(limit);
    }

    // .lean() returns a new Query instance — must be reassigned
    query = query.lean();

    // Populate user fields for admin views
    if (populateUser) {
        query = query.populate('user', 'name email role');
    }

    const [meals, total] = await Promise.all([
        query.exec(),
        Meal.countDocuments(filter),
    ]);

    const totalPages = getAll ? 1 : Math.ceil(total / limit);

    return {
        meals,
        pagination: {
            page:    getAll ? 1     : page,
            limit:   getAll ? total : limit,
            total,
            pages:   totalPages,
            hasNext: getAll ? false : skip + meals.length < total,
            hasPrev: getAll ? false : page > 1,
            isAll:   getAll,
        },
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

    // Cast mealId to ObjectId so $pull correctly matches the ObjectId stored
    // in User.meals (a plain string would fail to match the stored ObjectId).
    const mealObjectId = new mongoose.Types.ObjectId(mealId);

    await Promise.all([
        User.findByIdAndUpdate(
            meal.user._id,
            {
                $pull: { meals: mealObjectId },
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

/**
 * Vote for a meal poll on a specific date
 */
const voteMealPoll = async (userId, pollData) => {
    const { type, date: dateStr } = pollData;
    const date = parseDate(dateStr);

    // Update or create vote for this specific user on this specific date
    const poll = await MealPoll.findOneAndUpdate(
        { user: userId, date: date },
        { type, updatedBy: userId },
        { upsert: true, new: true, runValidators: true }
    );

    return poll;
};

/**
 * Get meal poll status for a specific date (includes carry-over logic)
 */
const getMealPollStatus = async (dateStr) => {
    const targetDate = parseDate(dateStr);

    // 1. Get all active approved users
    const users = await User.find({ isActive: true, userStatus: 'approved' })
        .select('name image email')
        .lean();

    // 2. For each user, find their latest vote ON or BEFORE targetDate
    const pollData = await Promise.all(users.map(async (user) => {
        const latestVote = await MealPoll.findOne({
            user: user._id,
            date: { $lte: targetDate }
        })
            .sort({ date: -1 })
            .lean();

        return {
            user,
            type: latestVote ? latestVote.type : 'off', // Default to 'off' if no vote ever
            lastUpdated: latestVote ? latestVote.updatedAt : null,
            voteDate: latestVote ? latestVote.date : null
        };
    }));

    // 3. Aggregate stats
    const stats = {
        total: pollData.length,
        day: pollData.filter(p => p.type === 'day' || p.type === 'both').length,
        night: pollData.filter(p => p.type === 'night' || p.type === 'both').length,
        off: pollData.filter(p => p.type === 'off').length,
        both: pollData.filter(p => p.type === 'both').length
    };

    return {
        date: targetDate,
        votes: pollData,
        stats
    };
};

module.exports = {
    createMeal,
    bulkCreateMeals,
    queryMeals,
    getMealById,
    updateMealById,
    deleteMealById,
    verifyUserExists,
    voteMealPoll,
    getMealPollStatus
};