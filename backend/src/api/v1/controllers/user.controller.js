const asyncHandler = require('../../../utils/helpers/asyncHandler');
const pick = require('../../../utils/helpers/pick');
const { userService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');

const createUser = asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body);
    sendSuccessResponse(res, 201, 'User created successfully', user);
});

const getUsers = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['userStatus', 'role', 'isActive', 'payment']);
    const options = pick(req.query, ['page', 'limit']);
    const result = await userService.getAllUsers(filter, options);
    sendSuccessResponse(res, 200, 'Users retrieved successfully', result);
});

const getUser = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.userId || req.user.id);
    if (!user) {
        // Since we use global error handler via asyncHandler, we should probably throw AppError in service, 
        // but if service returns null/undefined, we handle it here. 
        // Service actually throws AppError if not found, so this check might be redundant if service is strict.
        // But userService.getUserById throws if not found? Let's check service.
        // Yes line 15: throw new AppError('User not found', 404);
        // So we don't need the check here if we trust service.
        // But let's keep it simple.
    }
    // If service throws, it goes to error handler.
    sendSuccessResponse(res, 200, 'User details', user);
});

const updateUser = asyncHandler(async (req, res) => {
    // If admin is updating another user (via params) or user updating self (via user.id)
    // The route handles params.userId. If /me, params.userId is undefined? 
    // Actually /me route calls updateUser with req.user.id potentially?
    // Let's look at routes. /me calls getUser/updateUser.
    // If /me, we should probably pass req.user.id.
    const userId = req.params.userId || req.user.id;
    const user = await userService.updateProfile(userId, req.body);
    sendSuccessResponse(res, 200, 'User updated successfully', user);
});

const deleteUser = asyncHandler(async (req, res) => {
    // Soft delete/deactivate
    await userService.deactivateAccount(req.params.userId);
    res.status(204).send();
});

const approveUser = asyncHandler(async (req, res) => {
    const user = await userService.approveAccount(req.params.userId, req.user.id);
    sendSuccessResponse(res, 200, 'User approved successfully', user);
});

const denyUser = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const user = await userService.denyAccount(req.params.userId, req.user.id, reason);
    sendSuccessResponse(res, 200, 'User denied successfully', user);
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const user = await userService.updatePaymentStatus(req.params.userId, status);
    sendSuccessResponse(res, 200, 'Payment status updated', user);
});

const getStats = asyncHandler(async (req, res) => {
    const stats = await userService.getUserStats();
    sendSuccessResponse(res, 200, 'User statistics', stats);
});

const getGrandTotalMarketAmount = async (req, res) => {
    const grandTotal = await userService.getGrandTotalMarketAmount();
    sendSuccessResponse(res, 200, 'Grand total market amount', grandTotal)
};

const getGrandTotalMeal = async (req, res) => {
const overallMeal = await userService.getGrandTotalMeal()
sendSuccessResponse(res, 200, 'Overall total meals', overallMeal)
}

const getMealCharge = async (req, res) => {
    const mealCharge = await userService.getMealCharge();
    sendSuccessResponse(res, 200, 'Meal charge per user', mealCharge)
};

module.exports = {
    createUser,
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    approveUser,
    denyUser,
    updatePaymentStatus,
    getStats,
    getGrandTotalMarketAmount,
    getGrandTotalMeal,
    getMealCharge
};
