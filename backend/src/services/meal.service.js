const mongoose = require('mongoose');
const Meal = require('../models/Meal.model');
const MealPoll = require('../models/MealPoll.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const { parseDate, normalizeDate } = require('../utils/helpers/date.helper');
const { recalculateAllActiveUsersPayable } = require('./user.service');
const { writeAuditLog } = require('./mealPollAudit.service');

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

  // Recalculate payable for all active users
  recalculateAllActiveUsersPayable();

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

    // Recalculate payable for all active users
    recalculateAllActiveUsersPayable();

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
        query = query.populate('user', 'name email role image');
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
    const finalMealCount = (mealTypeCountMap[finalType] ?? 0) + finalGuestCount;

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

    // Recalculate payable for all active users
    recalculateAllActiveUsersPayable();

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

    // Recalculate payable for all active users
    recalculateAllActiveUsersPayable();

    return meal;
};

const MAX_BULK_DELETE = 100;

/**
 * Bulk delete meals by IDs.
 *
 * - Validates IDs are valid ObjectIds (max MAX_BULK_DELETE).
 * - For non-admin users: only deletes meals owned by that user.
 * - For admin: deletes any of the requested meals.
 * - Safely syncs User.totalMeal / User.guestMeal in bulk.
 * - Idempotent: already-deleted IDs are returned as notFound, no error.
 */
const bulkDeleteMeals = async ({ mealIds, user }) => {
    if (!Array.isArray(mealIds) || mealIds.length === 0) {
        throw new AppError('mealIds must be a non-empty array', 400);
    }

    if (mealIds.length > MAX_BULK_DELETE) {
        throw new AppError(`Maximum ${MAX_BULK_DELETE} meals can be deleted at once`, 400);
    }

    // Validate each ID is a valid ObjectId
    for (const id of mealIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AppError(`Invalid meal ID: ${id}`, 400);
        }
    }

    const objectIds = mealIds.map((id) => new mongoose.Types.ObjectId(id));

    // Fetch existing meals for these IDs
    const existingMeals = await Meal.find({ _id: { $in: objectIds } })
        .select('user mealCount guestCount')
        .lean();

    const foundIds = new Set(existingMeals.map((m) => m._id.toString()));
    const notFound = mealIds.filter((id) => !foundIds.has(id));

    let authorizedMeals = existingMeals;

    // Non-admin users can only delete their own meals
    if (user.role !== 'admin') {
        authorizedMeals = existingMeals.filter(
            (m) => m.user.toString() === user.id,
        );
    }

    if (authorizedMeals.length === 0) {
        throw new AppError('No authorized meals found to delete', 404);
    }

    // Accumulate per-user stat deltas
    const userDeltas = {};
    const authorizedIds = [];

    for (const meal of authorizedMeals) {
        authorizedIds.push(meal._id);
        const uid = meal.user.toString();

        if (!userDeltas[uid]) {
            userDeltas[uid] = { totalMeal: 0, guestMeal: 0, mealObjectIds: [] };
        }

        userDeltas[uid].totalMeal -= meal.mealCount || 0;
        userDeltas[uid].guestMeal -= meal.guestCount || 0;
        userDeltas[uid].mealObjectIds.push(meal._id);
    }

    // Execute meal deletion and user stat sync in parallel
    const userUpdateOps = Object.entries(userDeltas).map(([uid, delta]) => ({
        updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(uid) },
            update: {
                $pull: { meals: { $in: delta.mealObjectIds } },
                $inc: {
                    totalMeal: delta.totalMeal,
                    guestMeal: delta.guestMeal,
                },
            },
        },
    }));

    await Promise.all([
        Meal.deleteMany({ _id: { $in: authorizedIds } }),
        userUpdateOps.length > 0 ? User.bulkWrite(userUpdateOps) : Promise.resolve(),
    ]);

    // Recalculate payable for all active users
    recalculateAllActiveUsersPayable();

    return {
        deletedCount: authorizedIds.length,
        notFound,
        totalRequested: mealIds.length,
    };
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
 * Resolve the effective vote for a given user on a given date.
 * Uses half-open interval: date <= D AND (effectiveUntil is null OR effectiveUntil > D).
 *
 * Returns the MealPoll document or null (caller should treat null as 'off').
 */
const resolveEffectiveVote = async (userId, targetDate) => {
    return MealPoll.findOne({
        user: userId,
        date: { $lte: targetDate },
        $or: [
            { effectiveUntil: null },
            { effectiveUntil: { $gt: targetDate } },
        ],
    }).sort({ date: -1 }).lean();
};

/**
 * Close any open standing preferences for a user that would conflict
 * with a new vote effective on `effectiveFrom`.
 *
 * Atomically sets effectiveUntil on all active records (effectiveUntil: null)
 * whose date < effectiveFrom. This prevents two simultaneous active preferences.
 *
 * Returns the number of records closed.
 */
const closePreviousStandingPreferences = async (userId, effectiveFrom) => {
    const result = await MealPoll.updateMany(
        {
            user: userId,
            effectiveUntil: null,
            date: { $lt: effectiveFrom },
        },
        { $set: { effectiveUntil: effectiveFrom } }
    );
    return result.modifiedCount;
};

/**
 * Close any open standing preferences for a user that would conflict
 * with a new vote effective on `effectiveFrom`, including records with
 * date >= effectiveFrom (same boundary or later).
 *
 * Used when re-voting on or after the same effective boundary to ensure
 * at most one active preference per user.
 *
 * Returns the number of records closed.
 */
const closeAllStandingPreferences = async (userId, effectiveFrom) => {
    const result = await MealPoll.updateMany(
        {
            user: userId,
            effectiveUntil: null,
            date: { $gte: effectiveFrom },
        },
        { $set: { effectiveUntil: effectiveFrom } }
    );
    return result.modifiedCount;
};

/**
 * Vote for a meal poll — creates or updates a standing preference.
 *
 * Standing-preference model (effective-dated, half-open intervals):
 *   - date = effectiveFrom (the date from which this preference is active)
 *   - effectiveUntil = null (active indefinitely) or the effectiveFrom of the next vote
 *   - At most one active standing preference per user (unique partial index)
 *
 * Idempotent: same choice + same effectiveFrom returns existing record.
 * Race-safe: unique partial index prevents duplicate active preferences.
 * Retry-safe: requestId-based audit log idempotency.
 *
 * @param {string} userId - The voting user's ID
 * @param {object} pollData - { type, date, requestId }
 * @returns {object} The upserted MealPoll document
 */
const voteMealPoll = async (userId, pollData) => {
    const { type, date: dateStr, requestId } = pollData;
    const effectiveFrom = normalizeDate(parseDate(dateStr));

    // ── 1. Validate inputs ──────────────────────────────────────────────
    const validTypes = ['day', 'night', 'both', 'off'];
    if (!validTypes.includes(type)) {
        throw new AppError(`Invalid vote type: "${type}". Must be one of: ${validTypes.join(', ')}`, 400);
    }

    // ── 2. Find current active standing preference ──────────────────────
    const currentActive = await MealPoll.findOne({
        user: userId,
        effectiveUntil: null,
    }).lean();

    // ── 3. Idempotency: same choice + same effective boundary → no-op ───
    if (
        currentActive &&
        currentActive.type === type &&
        currentActive.date.getTime() === effectiveFrom.getTime()
    ) {
        // Write audit as unchanged for traceability
        try {
            await writeAuditLog({
                userId,
                eventType: 'vote_unchanged',
                pollDate: effectiveFrom,
                previousState: { type: currentActive.type, updatedAt: currentActive.updatedAt },
                newState: { type: currentActive.type, updatedAt: currentActive.updatedAt },
                requestId,
                source: 'manual',
            });
        } catch (auditErr) {
            console.error('[MealPollAudit] Failed to write audit log:', auditErr);
        }
        return currentActive;
    }

    // ── 4. Capture before-state for audit ───────────────────────────────
    const previousState = currentActive
        ? { type: currentActive.type, updatedAt: currentActive.updatedAt }
        : null;

    // ── 5. Close ALL standing preferences on or after effectiveFrom ─────
    // This handles: re-voting on same boundary, changing vote, etc.
    await closeAllStandingPreferences(userId, effectiveFrom);

    // Also close any earlier active preferences that haven't been closed
    // (edge case: old daily records from before migration)
    await closePreviousStandingPreferences(userId, effectiveFrom);

    // ── 6. Create new standing preference ───────────────────────────────
    const newPoll = await MealPoll.findOneAndUpdate(
        { user: userId, date: effectiveFrom },
        {
            type,
            source: 'manual',
            updatedBy: userId,
            effectiveUntil: null, // Active standing preference
        },
        { upsert: true, new: true, runValidators: true }
    );

    // ── 7. Write audit log ──────────────────────────────────────────────
    let eventType;
    if (!currentActive) {
        eventType = 'vote_created';
    } else {
        // Close audit for the superseded preference
        try {
            await writeAuditLog({
                userId,
                eventType: 'vote_preference_closed',
                pollDate: currentActive.date,
                previousState: { type: currentActive.type, updatedAt: currentActive.updatedAt },
                newState: { type, updatedAt: newPoll.updatedAt },
                requestId,
                source: 'manual',
            });
        } catch (auditErr) {
            console.error('[MealPollAudit] Failed to write preference_closed audit log:', auditErr);
        }
        eventType = 'vote_updated';
    }

    try {
        await writeAuditLog({
            userId,
            eventType,
            pollDate: effectiveFrom,
            previousState,
            newState: { type, updatedAt: newPoll.updatedAt },
            requestId,
            source: 'manual',
        });
    } catch (auditErr) {
        console.error('[MealPollAudit] Failed to write audit log:', auditErr);
    }

    // ── 8. Auto-create meal for today if vote is for today or past ─────
    const today = normalizeDate(new Date());
    if (effectiveFrom.getTime() <= today.getTime()) {
        try {
            await autoCreateMealForUser(userId, today, type);
        } catch (mealErr) {
            console.error('[VoteMealPoll] Auto-create meal failed:', mealErr.message);
        }
    }

    return newPoll;
};

/**
 * Get meal poll status for a specific date.
 * Resolves the effective standing preference for each active user
 * using half-open interval: date <= D AND (effectiveUntil is null OR effectiveUntil > D).
 *
 * Performance: batch-queries all users in one aggregation instead of N+1.
 */
const getMealPollStatus = async (dateStr) => {
    const targetDate = normalizeDate(parseDate(dateStr));

    // 1. Get all active approved users
    const users = await User.find({ isActive: true, userStatus: 'approved' })
        .select('name image email')
        .lean();

    if (users.length === 0) {
        return { date: targetDate, votes: [], stats: { total: 0, day: 0, night: 0, off: 0, both: 0 } };
    }

    const userIds = users.map(u => u._id);

    // 2. Batch-fetch effective votes for ALL users in one query
    const effectiveVotes = await MealPoll.aggregate([
        {
            $match: {
                user: { $in: userIds },
                date: { $lte: targetDate },
                $or: [
                    { effectiveUntil: null },
                    { effectiveUntil: { $gt: targetDate } },
                ],
            },
        },
        { $sort: { date: -1 } },
        // Group by user, take the first (most recent) match
        {
            $group: {
                _id: '$user',
                type: { $first: '$type' },
                date: { $first: '$date' },
                updatedAt: { $first: '$updatedAt' },
            },
        },
    ]);

    // 3. Index votes by userId for O(1) lookup
    const voteMap = new Map();
    for (const v of effectiveVotes) {
        voteMap.set(v._id.toString(), v);
    }

    // 4. Build result: merge users with their effective votes
    const pollData = users.map((user) => {
        const vote = voteMap.get(user._id.toString());
        return {
            user,
            type: vote ? vote.type : 'off',
            lastUpdated: vote ? vote.updatedAt : null,
            voteDate: vote ? vote.date : null,
        };
    });

    // 5. Aggregate stats
    const stats = {
        total: pollData.length,
        day: pollData.filter(p => p.type === 'day' || p.type === 'both').length,
        night: pollData.filter(p => p.type === 'night' || p.type === 'both').length,
        off: pollData.filter(p => p.type === 'off').length,
        both: pollData.filter(p => p.type === 'both').length,
    };

    return { date: targetDate, votes: pollData, stats };
};

/**
 * Auto-create or update a single Meal record for a user on a given date
 * based on their vote type. Used for real-time meal creation when a user votes.
 *
 * - Idempotent: skips if meal already exists with the same type.
 * - Overwrites if meal exists with a different type.
 * - Syncs User.totalMeal and User.meals.
 * - Calls recalculateAllActiveUsersPayable().
 *
 * @param {string} userId
 * @param {Date} date - Normalized to midnight UTC
 * @param {string} type - 'day' | 'night' | 'both' | 'off'
 */
const autoCreateMealForUser = async (userId, date, type) => {
    const normalizedDate = normalizeDate(date);
    const mealCount = mealTypeCountMap[type] ?? 0;

    const existing = await Meal.findOne({ user: userId, date: normalizedDate }).lean();

    if (existing) {
        if (existing.type === type) return;

        const oldMealCount = existing.mealCount || 0;
        const mealCountDiff = mealCount - oldMealCount;

        await Meal.updateOne(
            { _id: existing._id },
            { $set: { type, mealCount, isGuestMeal: false, guestCount: 0, remarks: 'Auto-created from vote' } },
        );

        if (mealCountDiff !== 0) {
            await User.findByIdAndUpdate(userId, { $inc: { totalMeal: mealCountDiff } });
        }

        recalculateAllActiveUsersPayable();
        return;
    }

    const mealId = new mongoose.Types.ObjectId();
    await Promise.all([
        Meal.create({
            _id: mealId,
            user: userId,
            date: normalizedDate,
            type,
            mealCount,
            isGuestMeal: false,
            guestCount: 0,
            remarks: 'Auto-created from vote',
        }),
        User.findByIdAndUpdate(
            userId,
            { $push: { meals: mealId }, $inc: { totalMeal: mealCount } },
            { runValidators: true },
        ),
    ]);

    recalculateAllActiveUsersPayable();
};

/**
 * Auto-create/update Meal records for all active users based on their
 * effective vote for a given date. Used by the daily cron job.
 *
 * Performance: 5 queries total regardless of user count.
 *   1. Fetch active approved users
 *   2. Batch-fetch effective votes (aggregation)
 *   3. Batch-fetch existing meals for the date
 *   4. BulkWrite meal inserts/updates
 *   5. BulkWrite user stat syncs
 *
 * Idempotent — safe to re-run. Existing meals with correct type are skipped.
 *
 * @param {Date} targetDate
 * @returns {{ created: number, updated: number, skipped: number, errors: number, total: number }}
 */
const autoCreateMealsFromVotes = async (targetDate) => {
    const date = normalizeDate(targetDate);

    // 1. All active approved users
    const users = await User.find({ isActive: true, userStatus: 'approved' })
        .select('_id')
        .lean();

    if (users.length === 0) {
        return { created: 0, updated: 0, skipped: 0, errors: 0, total: 0 };
    }

    const userIds = users.map(u => u._id);

    // 2. Batch-fetch effective votes via aggregation (single query)
    const effectiveVotes = await MealPoll.aggregate([
        {
            $match: {
                user: { $in: userIds },
                date: { $lte: date },
                $or: [
                    { effectiveUntil: null },
                    { effectiveUntil: { $gt: date } },
                ],
            },
        },
        { $sort: { date: -1 } },
        {
            $group: {
                _id: '$user',
                type: { $first: '$type' },
            },
        },
    ]);

    // Index votes by userId for O(1) lookup
    const voteMap = new Map();
    for (const v of effectiveVotes) {
        voteMap.set(v._id.toString(), v.type);
    }

    // 3. Batch-fetch existing meals for this date (single query)
    const existingMeals = await Meal.find({
        user: { $in: userIds },
        date,
    }).select('user type mealCount').lean();

    const existingMap = new Map();
    for (const m of existingMeals) {
        existingMap.set(m.user.toString(), m);
    }

    // 4. Build bulk operations
    const insertDocs = [];
    const updateOps = [];
    const userInsertDeltas = {};
    const userUpdateDeltas = {};
    let skippedCount = 0;

    for (const uid of userIds) {
        const uidStr = uid.toString();
        const voteType = voteMap.get(uidStr) || 'off';
        const mealCount = mealTypeCountMap[voteType] ?? 0;
        const existing = existingMap.get(uidStr);

        if (existing && existing.type === voteType) {
            skippedCount++;
            continue;
        }

        if (existing) {
            const oldMealCount = existing.mealCount || 0;
            const mealCountDiff = mealCount - oldMealCount;

            updateOps.push({
                updateOne: {
                    filter: { user: uid, date },
                    update: {
                        $set: {
                            type: voteType,
                            mealCount,
                            isGuestMeal: false,
                            guestCount: 0,
                            remarks: 'Auto-created from vote',
                        },
                    },
                },
            });

            if (mealCountDiff !== 0) {
                userUpdateDeltas[uidStr] = (userUpdateDeltas[uidStr] || 0) + mealCountDiff;
            }
        } else {
            const mealId = new mongoose.Types.ObjectId();
            insertDocs.push({
                _id: mealId,
                user: uid,
                date,
                type: voteType,
                mealCount,
                isGuestMeal: false,
                guestCount: 0,
                remarks: 'Auto-created from vote',
            });

            if (!userInsertDeltas[uidStr]) {
                userInsertDeltas[uidStr] = { totalMeal: 0, mealIds: [] };
            }
            userInsertDeltas[uidStr].totalMeal += mealCount;
            userInsertDeltas[uidStr].mealIds.push(mealId);
        }
    }

    // 5. Execute bulk writes
    if (updateOps.length > 0) {
        await Meal.bulkWrite(updateOps, { ordered: false });
    }

    if (insertDocs.length > 0) {
        await Meal.bulkWrite(
            insertDocs.map(doc => ({ insertOne: { document: doc } })),
            { ordered: false },
        );
    }

    // 6. Sync user stats
    const userUpdateOps = [];

    for (const [uid, delta] of Object.entries(userInsertDeltas)) {
        userUpdateOps.push({
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(uid) },
                update: {
                    $push: { meals: { $each: delta.mealIds } },
                    $inc: { totalMeal: delta.totalMeal },
                },
            },
        });
    }

    for (const [uid, diff] of Object.entries(userUpdateDeltas)) {
        userUpdateOps.push({
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(uid) },
                update: { $inc: { totalMeal: diff } },
            },
        });
    }

    if (userUpdateOps.length > 0) {
        await User.bulkWrite(userUpdateOps);
    }

    // 7. Recalculate payables for all active users
    recalculateAllActiveUsersPayable();

    return {
        created: insertDocs.length,
        updated: updateOps.length,
        skipped: skippedCount,
        errors: 0,
        total: users.length,
    };
};

/**
 * Carry-forward: ensures every active user has an effective standing preference
 * covering the target date.
 *
 * With the standing-preference model, carry-forward is implicit — a user's
 * standing vote covers all future dates until superseded. This function only
 * needs to handle:
 *   1. Users who have NEVER voted → create a default 'off' standing preference
 *   2. Users whose active preference already covers today → skip (no-op)
 *   3. Deactivated users → close their standing preference
 *
 * Idempotent — safe to re-run.
 * Returns { created, closed, skipped, errors } for logging.
 */
const carryForwardVotes = async (targetDate) => {
    const date = normalizeDate(targetDate);

    // 1. All approved users (active and inactive)
    const allUsers = await User.find({ userStatus: 'approved' })
        .select('_id isActive')
        .lean();

    let created = 0;
    let closed = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of allUsers) {
        try {
            // 2. Check if user already has an active standing preference
            const activeVote = await MealPoll.findOne({
                user: user._id,
                effectiveUntil: null,
            }).lean();

            if (activeVote) {
                if (user.isActive) {
                    // 3. Active user with existing preference → record carry-forward audit log
                    //    so the activity logs reflect that this vote carried forward to today.
                    const cfRequestId = `cf-${user._id.toString()}-${date.toISOString().slice(0, 10)}`;
                    try {
                        await writeAuditLog({
                            userId: user._id,
                            eventType: 'vote_carried_forward',
                            pollDate: date,
                            previousState: null,
                            newState: { type: activeVote.type, updatedAt: activeVote.updatedAt },
                            source: 'carried_forward',
                            requestId: cfRequestId,
                        });
                    } catch (auditErr) {
                        console.error(`[CarryForward] Audit log failed for user ${user._id}:`, auditErr.message);
                    }
                    skipped++;
                    continue;
                }
                // 4. Deactivated user → close their standing preference
                await MealPoll.updateOne(
                    { _id: activeVote._id },
                    { $set: { effectiveUntil: date } }
                );
                closed++;
                continue;
            }

            // 5. No active preference exists
            if (!user.isActive) {
                // Deactivated user with no preference → nothing to do
                skipped++;
                continue;
            }

            // 6. Active user who has never voted → create default 'off' preference
            await MealPoll.create({
                user: user._id,
                type: 'off',
                date: date,
                effectiveUntil: null,
                source: 'carried_forward',
                updatedBy: user._id,
            });

            const neverVotedCfRequestId = `cf-${user._id.toString()}-${date.toISOString().slice(0, 10)}-never-voted`;
            try {
                await writeAuditLog({
                    userId: user._id,
                    eventType: 'vote_carried_forward',
                    pollDate: date,
                    previousState: null,
                    newState: { type: 'off', updatedAt: new Date() },
                    source: 'carried_forward',
                    requestId: neverVotedCfRequestId,
                });
            } catch (auditErr) {
                console.error(`[CarryForward] Audit log failed for user ${user._id}:`, auditErr.message);
            }

            created++;
        } catch (err) {
            console.error(`[CarryForward] Failed for user ${user._id}:`, err.message);
            errors++;
        }
    }

    return { created, closed, skipped, errors, total: allUsers.length };
};

module.exports = {
    createMeal,
    bulkCreateMeals,
    queryMeals,
    getMealById,
    updateMealById,
    deleteMealById,
    bulkDeleteMeals,
    verifyUserExists,
    voteMealPoll,
    getMealPollStatus,
    carryForwardVotes,
    resolveEffectiveVote,
    autoCreateMealForUser,
    autoCreateMealsFromVotes,
};