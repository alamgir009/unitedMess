const asyncHandler = require('../../../utils/helpers/asyncHandler');
const pick = require('../../../utils/helpers/pick');
const { userService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const mongoose = require('mongoose');
const AppError = require('../../../utils/errors/AppError');   // <-- added

// Validation helper
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Validate and extract userId from params or current user
 */
const resolveUserId = (req, allowAdmin = false) => {
    const paramId = req.params?.userId;

    // Admin accessing specific user
    if (allowAdmin && paramId) {
        if (!isValidObjectId(paramId)) {
            throw new AppError('Invalid user ID format', 400);
        }
        return paramId;
    }

    // Self-access (me routes)
    if (!req.user?.id) {
        throw new AppError('Authentication required', 401);
    }
    return req.user.id;
};

// ==================== CRUD Operations ====================

const getUsers = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['userStatus', 'role', 'isActive', 'payment']);
    const options = pick(req.query, ['page', 'limit', 'sort', 'fields']);

    // Sanitize numeric params
    if (options.page) options.page = Math.max(1, parseInt(options.page, 10));
    if (options.limit) options.limit = Math.min(100, Math.max(1, parseInt(options.limit, 10)));

    const result = await userService.getAllUsers(filter, options);
    sendSuccessResponse(res, 200, 'Users retrieved successfully', result);
});

const searchUsers = asyncHandler(async (req, res) => {
    const { q: searchTerm, ...rest } = req.query;
    const options = pick(rest, ['page', 'limit']);

    if (!searchTerm?.trim()) {
        return sendSuccessResponse(res, 200, 'Search results', { users: [], pagination: { total: 0 } });
    }

    const result = await userService.searchUsers(searchTerm.trim(), options);
    sendSuccessResponse(res, 200, 'Search results', result);
});

const getUser = asyncHandler(async (req, res) => {
    // Admin viewing specific user
    const userId = resolveUserId(req, true);
    const user = await userService.getUserById(userId);
    sendSuccessResponse(res, 200, 'User details retrieved', user);
});

const getMe = asyncHandler(async (req, res) => {
    // Current user viewing self
    const user = await userService.getUserById(req.user.id);
    sendSuccessResponse(res, 200, 'Profile retrieved', user);
});

const updateUser = asyncHandler(async (req, res) => {
    const userId = resolveUserId(req, true);
    const user = await userService.updateProfile(userId, req.body, true);
    sendSuccessResponse(res, 200, 'User updated successfully', user);
});

const updateMe = asyncHandler(async (req, res) => {
    // Self-update restrictions
    const allowedUpdates = pick(req.body, ['name', 'phone', 'image', 'email']);
    const user = await userService.updateProfile(req.user.id, allowedUpdates, false);
    sendSuccessResponse(res, 200, 'Profile updated successfully', user);
});

// Admin deletes any user
const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await userService.deactivateAccount(userId);
    res.status(204).send();
});

// User deactivates their own account
const deactivateMyAccount = asyncHandler(async (req, res) => {
    await userService.deactivateAccount(req.user.id);
    res.status(204).send();
});

// ==================== Admin Actions ====================

const approveUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    // Service will throw if user not found or already approved
    const user = await userService.approveAccount(userId, req.user.id);
    sendSuccessResponse(res, 200, 'User approved successfully', user);
});

const denyUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason?.trim()) {
        throw new AppError('Denial reason is required', 400);
    }

    const user = await userService.denyAccount(userId, req.user.id, reason.trim());
    sendSuccessResponse(res, 200, 'User denied successfully', user);
});

// ==================== Status Updates ====================

const updatePaymentStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await userService.updatePaymentStatus(userId, status);
    sendSuccessResponse(res, 200, 'Payment status updated', user);
});

const updateGasBillStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await userService.updateGasBillStatus(userId, status);
    sendSuccessResponse(res, 200, 'Gas bill status updated', user);
});

// ==================== Statistics & Calculations ====================

const getStats = asyncHandler(async (req, res) => {
    const stats = await userService.getUserStats();
    sendSuccessResponse(res, 200, 'User statistics', stats);
});

const getGrandTotalMarketAmount = asyncHandler(async (req, res) => {
    const grandTotal = await userService.getGrandTotalMarketAmount();
    sendSuccessResponse(res, 200, 'Grand total market amount', { grandTotal });
});

const getGrandTotalMeal = asyncHandler(async (req, res) => {
    const overallMeal = await userService.getGrandTotalMeal();
    sendSuccessResponse(res, 200, 'Overall total meals', { overallMeal });
});

const getMealCharge = asyncHandler(async (req, res) => {
    const mealCharge = await userService.getMealCharge();
    sendSuccessResponse(res, 200, 'Current meal charge rate', { mealCharge });
});

const getPaybleAmountforMeal = asyncHandler(async (req, res) => {
    // Allow admin to check any user, self only for regular users
    const userId = req.params.userId && req.user.role === 'admin'
        ? req.params.userId
        : req.user.id;

    if (!isValidObjectId(userId)) {
        throw new AppError('Invalid user ID', 400);
    }

    const payingAmount = await userService.getPaybleAmountforMeal(userId);
    sendSuccessResponse(res, 200, 'Payable meal charge calculated', payingAmount);
});

// ==================== Bulk Operations (if needed) ====================

const bulkUpdateStatus = asyncHandler(async (req, res) => {
    const { userIds, status, type } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('User IDs array required', 400);
    }

    const validIds = userIds.filter(isValidObjectId);
    if (validIds.length !== userIds.length) {
        throw new AppError('Some user IDs are invalid', 400);
    }

    // Parallel processing with concurrency limit
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < validIds.length; i += batchSize) {
        const batch = validIds.slice(i, i + batchSize);
        const batchPromises = batch.map(id =>
            type === 'payment'
                ? userService.updatePaymentStatus(id, status)
                : userService.updateGasBillStatus(id, status)
        );
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    sendSuccessResponse(res, 200, 'Bulk update completed', {
        processed: validIds.length,
        successful,
        failed
    });
});

module.exports = {
    getUsers,
    searchUsers,
    getUser,
    getMe,
    updateUser,
    updateMe,
    deleteUser,
    approveUser,
    denyUser,
    updatePaymentStatus,
    updateGasBillStatus,
    getStats,
    getGrandTotalMarketAmount,
    getGrandTotalMeal,
    getMealCharge,
    getPaybleAmountforMeal,
    bulkUpdateStatus,
    deactivateMyAccount
};