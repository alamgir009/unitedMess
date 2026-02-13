const User = require("../models/User.model");
const AppError = require("../utils/errors/AppError");


/**
 * Update the guest meal charge for all users.
 * @param {Object} updateData - Contains the new chargePerGuestMeal value.
 * @returns {Promise<Object>} - Result of the update operation.
 */
async function updateGuestMealCharge(updateData) {
    const { chargePerGuestMeal } = updateData;

    if (typeof chargePerGuestMeal !== 'number' || chargePerGuestMeal < 0) {
        throw new AppError('chargePerGuestMeal must be a non‑negative number', 400);
    }

    const result = await User.updateMany(
        {}, // empty filter = all users
        { $set: { chargePerGuestMeal } },
        { runValidators: true }
    );

    return result;
}

async function updateCookingCharge(updateData) {
    const { cookingCharge } = updateData;

    if (typeof cookingCharge !== 'number' || isNaN(cookingCharge) || cookingCharge < 0) {
        throw new AppError('cookingCharge must be a valid non‑negative number', 400);
    }

    const result = await User.updateMany(
        {},
        { $set: { cookingCharge } },
        { runValidators: true }
    );
    return result;
}

/**
 * Distribute a total water bill equally among all active users.
 * Each active user's `waterBill` field is set to the rounded per‑user amount.
 *
 * @param {Object} updateData - Contains the total water bill amount.
 * @returns {Promise<Object>} - Result of the update operation.
 */
async function updateWaterBill(updateData) {
    const { waterBill } = updateData;

    if (typeof waterBill !== 'number' || isNaN(waterBill) || waterBill < 0) {
        throw new AppError('waterBill must be a valid non‑negative number', 400);
    }
    const activeUserCount = await User.countDocuments({ isActive: true });
    if (activeUserCount === 0) {
        return { message: 'No active users found', modifiedCount: 0 };
    }

    const perUserWaterBill = Math.round(waterBill / activeUserCount);

    const result = await User.updateMany(
        { isActive: true },
        { $set: { waterBill: perUserWaterBill } },
        { runValidators: true }
    );

    return result;
}


async function updateGasBillCharge(updateData) {
    const { gasBillCharge } = updateData;

    if (typeof gasBillCharge !== 'number' || isNaN(gasBillCharge) || gasBillCharge < 0) {
        throw new AppError('gasBillCharge must be a valid non‑negative number', 400);
    }
    const activeUserCount = await User.countDocuments({ isActive: true });
    if (activeUserCount === 0) {
        return { message: 'No active users found', modifiedCount: 0 };
    }

    const perUsergasBillCharge = Math.round(gasBillCharge / activeUserCount);

    const result = await User.updateMany(
        { isActive: true },
        { $set: { gasBillCharge: perUsergasBillCharge } },
        { runValidators: true }
    );

    return result;
}

module.exports = {
    updateGuestMealCharge,
    updateCookingCharge,
    updateWaterBill,
    updateGasBillCharge
}