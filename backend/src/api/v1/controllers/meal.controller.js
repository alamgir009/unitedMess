const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { mealService, mealPollAuditService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const pick = require('../../../utils/helpers/pick');
const AppError = require('../../../utils/errors/AppError');
const { getVisibleBillingStartDate } = require('../../../utils/helpers/date.helper');

// ─── Authenticated User Controllers ────────────────────────────────────────────

const createMeal = asyncHandler(async (req, res) => {
    const meal = await mealService.createMeal({ ...req.body, user: req.user.id });
    sendSuccessResponse(res, 201, 'Meal created successfully', meal);
});

const bulkCreateMeals = asyncHandler(async (req, res) => {
    const { startDate, endDate, type, userIds, isGuestMeal, guestCount, remarks } = req.body;

    if (!startDate || !endDate) {
        throw new AppError('startDate and endDate are required', 400);
    }

    if (!type) {
        throw new AppError('type is required', 400);
    }

    const isAdmin = req.user.role === 'admin';
    const targetUsers = isAdmin && userIds?.length > 0 ? userIds : [req.user.id];

    const result = await mealService.bulkCreateMeals({
        startDate,
        endDate,
        type,
        userIds: targetUsers,
        isGuestMeal: isGuestMeal || false,
        guestCount: guestCount || 0,
        remarks: remarks || '',
        createdBy: req.user.id,
    });

    const message = result.inserted > 0
        ? `Successfully added ${result.inserted} meal(s), ${result.skipped} already existed`
        : `All ${result.skipped} meal(s) already existed`;

    sendSuccessResponse(res, 201, message, result);
});

const getMeals = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['date']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
        filter.user = req.user.id;
    }

    // Support explicit date range (used by the calendar view)
    // When startDate/endDate are provided, they override the billing-start-date default
    // so that navigating to any past month returns the correct data.
    if (req.query.startDate || req.query.endDate) {
        filter.date = {};
        if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
        if (req.query.endDate)   filter.date.$lte = new Date(req.query.endDate);
    } else if (!filter.date && !(isAdmin && req.query.allHistory === 'true')) {
        filter.date = { $gte: getVisibleBillingStartDate() };
    }

    const meals = await mealService.queryMeals(filter, options, isAdmin);
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
    sendSuccessResponse(res, 200, 'Meal deleted successfully', { id: req.params.mealId });
});

// ─── Meal Polling Controllers ───────────────────────────────────────────

const voteMealPoll = asyncHandler(async (req, res) => {
    const poll = await mealService.voteMealPoll(req.user.id, req.body);
    sendSuccessResponse(res, 200, 'Vote recorded successfully', poll);
});

const getMealPollStatus = asyncHandler(async (req, res) => {
    const date = req.query.date || new Date().toISOString();
    const status = await mealService.getMealPollStatus(date);
    sendSuccessResponse(res, 200, 'Meal poll status retrieved successfully', status);
});


// ─── Admin Controllers ──────────────────────────────────────────────────────────

const adminGetUserMeals = asyncHandler(async (req, res) => {
    await mealService.verifyUserExists(req.params.userId);

    const filter = { 
        ...pick(req.query, ['date']), 
        user: req.params.userId 
    };
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    // Apply 10th-day visual reset rule if not fetching all history
    if (!filter.date && req.query.allHistory !== 'true') {
        filter.date = { $gte: getVisibleBillingStartDate() };
    }

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

// ─── Bulk Delete ──────────────────────────────────────────────────────────

const bulkDeleteMeals = asyncHandler(async (req, res) => {
    const { mealIds } = req.body;

    if (!Array.isArray(mealIds) || mealIds.length === 0) {
        throw new AppError('mealIds must be a non-empty array', 400);
    }

    if (mealIds.length > 100) {
        throw new AppError('Maximum 100 meals can be deleted at once', 400);
    }

    const result = await mealService.bulkDeleteMeals({
        mealIds,
        user: req.user,
    });

    sendSuccessResponse(res, 200, `${result.deletedCount} meal(s) deleted successfully`, result);
});

// ─── Audit Log Controllers ──────────────────────────────────────────────────────

const getAuditMonths = asyncHandler(async (req, res) => {
    const months = await mealPollAuditService.getAuditMonths();
    sendSuccessResponse(res, 200, 'Audit months retrieved successfully', { months });
});

const getAuditDays = asyncHandler(async (req, res) => {
    const { monthKey } = req.params;
    const options = pick(req.query, ['page', 'limit']);
    options.page = parseInt(options.page) || 1;
    options.limit = parseInt(options.limit) || 50;

    const result = await mealPollAuditService.getAuditDays(monthKey, options);
    sendSuccessResponse(res, 200, 'Audit days retrieved successfully', result);
});

const getAuditLogsByDay = asyncHandler(async (req, res) => {
    const { dayKey } = req.params;
    const options = pick(req.query, ['page', 'limit']);
    options.page = parseInt(options.page) || 1;
    options.limit = parseInt(options.limit) || 50;

    const result = await mealPollAuditService.getAuditLogsByDay(dayKey, options);
    sendSuccessResponse(res, 200, 'Audit logs retrieved successfully', result);
});

module.exports = {
    createMeal,
    bulkCreateMeals,
    getMeals,
    getMeal,
    updateMeal,
    deleteMeal,
    bulkDeleteMeals,
    adminGetUserMeals,
    adminCreateMeal,
    adminUpdateMeal,
    adminDeleteMeal,
    voteMealPoll,
    getMealPollStatus,
    getAuditMonths,
    getAuditDays,
    getAuditLogsByDay,
};