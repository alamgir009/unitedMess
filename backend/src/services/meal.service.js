const mongoose = require('mongoose');
const Meal = require('../models/Meal.model');
const MealPoll = require('../models/MealPoll.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const { parseDate, normalizeDate } = require('../utils/helpers/date.helper');

const mealTypeCountMap = {
  off: 0,
  both: 2,
  day: 1,
  night: 1,
};

const MAX_BULK_DAYS = 31;
const MAX_USER_MEALS = 200;

/**
 * Bulk create meals for date range and multiple users.
 *
 * Strategy: One record per user per date. Existing records for the same
 * {user, date} are OVERWRITTEN with the new type/values. This prevents
 * duplicate/conflicting entries like "01/06/2026 Day + 01/06/2026 Off".
 */
const bulkCreateMeals = async ({ startDate, endDate, type, userIds, isGuestMeal, guestCount, remarks, createdBy }) => {
  const start = normalizeDate(parseDate(startDate));
  const end = normalizeDate(parseDate(endDate));

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

  const users = await User.find({ _id: { $in: userIds } }).select('_id meals').lean();
  if (users.length !== userIds.length) {
    throw new AppError('One or more users not found', 404);
  }

  // Generate normalized (midnight UTC) dates for the range
  const dates = [];
  for (let i = 0; i < daysDiff; i++) {
    dates.push(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i)));
  }

  // ── 1. Fetch ALL existing meals for these users × dates (no type filter) ──
  const existingMeals = await Meal.find({
    user: { $in: userIds },
    date: { $in: dates },
  }).select('user date type mealCount isGuestMeal guestCount').lean();

  // Index existing meals by `${user}-${date.getTime()}`
  const existingMap = new Map();
  for (const m of existingMeals) {
    const key = `${m.user.toString()}-${m.date.getTime()}`;
    existingMap.set(key, m);
  }

  const mealCount = mealTypeCountMap[type] ?? 0;
  const guestAdd = isGuestMeal ? (guestCount || 0) : 0;
  const totalMealCount = mealCount + guestAdd;

  // ── 2. Categorize per user-date pair ──────────────────────────────────
  const updateOps = [];         // overwrite existing records with new type
  const insertDocs = [];        // new records
  let skippedCount = 0;
  let updatedCount = 0;
  let insertedCount = 0;

  // Track user stat changes: { totalMeal, guestMeal, mealIds }
  const userDeltas = {};
  for (const uid of userIds) {
    userDeltas[uid] = { totalMeal: 0, guestMeal: 0, mealIds: [] };
  }

  for (const uid of userIds) {
    const delta = userDeltas[uid];

    for (const d of dates) {
      const key = `${uid}-${d.getTime()}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Same type → skip (no change needed)
        if (existing.type === type) {
          // Check if other fields changed (guest count, remarks)
          const guestChanged = (existing.isGuestMeal ? (existing.guestCount || 0) : 0) !== guestAdd;
          const remarksChanged = (existing.remarks || '') !== (remarks || '');
          const mealCountChanged = existing.mealCount !== totalMealCount;

          if (!guestChanged && !remarksChanged && !mealCountChanged) {
            skippedCount++;
            continue;
          }

          // Same type but guest/remark/mealCount changed → update in place
          updateOps.push({
            updateOne: {
              filter: { _id: existing._id },
              update: {
                $set: {
                  mealCount: totalMealCount,
                  isGuestMeal: isGuestMeal || false,
                  guestCount: guestAdd,
                  remarks: remarks || '',
                },
              },
            },
          });

          const oldGuest = existing.isGuestMeal ? (existing.guestCount || 0) : 0;
          delta.totalMeal += totalMealCount - (existing.mealCount || 0);
          delta.guestMeal += guestAdd - oldGuest;
          updatedCount++;
        } else {
          // Different type → OVERWRITE existing record
          const oldGuest = existing.isGuestMeal ? (existing.guestCount || 0) : 0;
          updateOps.push({
            updateOne: {
              filter: { _id: existing._id },
              update: {
                $set: {
                  type,
                  mealCount: totalMealCount,
                  isGuestMeal: isGuestMeal || false,
                  guestCount: guestAdd,
                  remarks: remarks || '',
                },
              },
            },
          });

          delta.totalMeal += totalMealCount - (existing.mealCount || 0);
          delta.guestMeal += guestAdd - oldGuest;
          updatedCount++;
        }
      } else {
        // No existing record → insert new
        const mealId = new mongoose.Types.ObjectId();
        insertDocs.push({
          _id: mealId,
          user: uid,
          date: d,
          type,
          mealCount: totalMealCount,
          isGuestMeal: isGuestMeal || false,
          guestCount: guestAdd,
          remarks: remarks || '',
        });

        delta.mealIds.push(mealId);
        delta.totalMeal += mealCount;
        delta.guestMeal += guestAdd;
      }
    }
  }

  // ── 3. Execute writes ────────────────────────────────────────────────
  if (updateOps.length > 0) {
    await Meal.bulkWrite(updateOps, { ordered: false });
  }

  if (insertDocs.length > 0) {
    const bulkResult = await Meal.bulkWrite(
      insertDocs.map(doc => ({ insertOne: { document: doc } })),
      { ordered: false },
    );
    insertedCount = bulkResult.insertedCount || 0;
  }

  // ── 4. Sync user stats ────────────────────────────────────────────────
  const userUpdateOps = [];
  for (const uid of userIds) {
    const delta = userDeltas[uid];
    const pushIds = delta.mealIds;

    const setFields = {};
    const unsetFields = {};

    if (pushIds.length > 0) {
      setFields.$push = { meals: { $each: pushIds } };
    }

    if (delta.totalMeal !== 0 || delta.guestMeal !== 0) {
      setFields.$inc = {};
      if (delta.totalMeal !== 0) setFields.$inc.totalMeal = delta.totalMeal;
      if (delta.guestMeal !== 0) setFields.$inc.guestMeal = delta.guestMeal;
    }

    if (Object.keys(setFields).length > 0) {
      userUpdateOps.push({
        updateOne: {
          filter: { _id: uid },
          update: setFields,
        },
      });
    }
  }

  if (userUpdateOps.length > 0) {
    await User.bulkWrite(userUpdateOps);
  }

  return {
    inserted: insertedCount,
    updated: updatedCount,
    skipped: skippedCount,
    total: userIds.length * daysDiff,
  };
};

/**
 * Create a meal
 */
const createMeal = async (mealBody) => {
    const { user } = mealBody;
    const date = normalizeDate(parseDate(mealBody.date));

    // Check if any meal already exists for this user+date (regardless of type)
    if (await Meal.exists({ user, date })) {
        const existing = await Meal.findOne({ user, date }).select('type').lean();
        const typeHint = existing ? ` (existing type: "${existing.type}")` : '';
        throw new AppError(`A meal already exists for this date${typeHint}`, 409);
    }

    mealBody.date = date;
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
 *
 * When the type is changed, we check whether another meal already exists
 * for the same user+date with the *target* type. If so, the existing meal
 * with the old type is deleted (replaced by the one being updated).
 * This prevents conflicting duplicates from surviving after an update.
 */
const updateMealById = async (mealId, updateBody) => {
    const meal = await getMealById(mealId);
    if (!meal) throw new AppError('Meal not found', 404);

    // ── 1. Resolve target date (normalized to midnight UTC) ──────────
    const targetDate = updateBody.date
        ? normalizeDate(parseDate(updateBody.date))
        : normalizeDate(meal.date);

    const dateChanged = targetDate.getTime() !== meal.date.getTime();

    // ── 2. Resolve final type & counts ──────────────────────────────
    const finalType = updateBody.type ?? meal.type;
    const finalIsGuestMeal = updateBody.isGuestMeal ?? meal.isGuestMeal;
    let finalGuestCount = updateBody.guestCount ?? meal.guestCount ?? 0;
    if (!finalIsGuestMeal) finalGuestCount = 0;
    const finalMealCount = mealTypeCountMap[finalType] ?? 0;

    // ── 3. Check for conflicting records on the target (user, date) ──
    // A conflict exists when another meal record occupies the same
    // {user, date} pair. Overwrite it by deleting the conflicting meal.
    if (dateChanged || meal.type !== finalType) {
        const conflictFilter = {
            user: meal.user._id,
            date: targetDate,
            _id: { $ne: mealId },
        };

        const conflict = await Meal.findOne(conflictFilter).lean();

        if (conflict) {
            // Delete the conflicting record and adjust user stats
            const conflictMealCount = conflict.mealCount || 0;
            const conflictGuestCount = conflict.isGuestMeal ? (conflict.guestCount || 0) : 0;

            await Promise.all([
                Meal.deleteOne({ _id: conflict._id }),
                User.findByIdAndUpdate(meal.user._id, {
                    $pull: { meals: conflict._id },
                    $inc: {
                        totalMeal: -conflictMealCount,
                        guestMeal: -conflictGuestCount,
                    },
                }),
            ]);
        }
    }

    // ── 4. Sync date field if changed ───────────────────────────────
    if (dateChanged) {
        updateBody.date = targetDate;
    } else {
        delete updateBody.date;
    }

    // ── 5. Apply updates ────────────────────────────────────────────
    const oldMealCount = meal.mealCount || 0;
    const oldGuestCount = meal.guestCount || 0;

    Object.assign(meal, updateBody, {
        type: finalType,
        isGuestMeal: finalIsGuestMeal,
        guestCount: finalGuestCount,
        mealCount: finalMealCount,
    });

    await meal.save();

    // ── 6. Sync user stats ──────────────────────────────────────────
    const mealDiff = finalMealCount - oldMealCount;
    const guestDiff = finalGuestCount - oldGuestCount;

    if (mealDiff || guestDiff) {
        await User.findByIdAndUpdate(
            meal.user._id,
            { $inc: { totalMeal: mealDiff, guestMeal: guestDiff } },
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
    const date = normalizeDate(parseDate(dateStr));

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
    const targetDate = normalizeDate(parseDate(dateStr));

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