const User = require("../models/User.model");
const AppError = require("../utils/errors/AppError");
const notificationService = require('./notification.service');


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

    await notificationService.sendToAllActiveUsers('BILLING', 'Guest Meal Charge Updated', `The guest meal charge has been updated to ${chargePerGuestMeal}.`);

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

    await notificationService.sendToAllActiveUsers('BILLING', 'Cooking Charge Updated', `The cooking charge has been updated to ${cookingCharge}.`);

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

    await notificationService.sendToAllActiveUsers('BILLING', 'Water Bill Updated', `The total water bill has been updated. Your share is ${perUserWaterBill}. Check your invoices.`);

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

    await notificationService.sendToAllActiveUsers('BILLING', 'Gas Bill Updated', `The total gas bill has been updated. Your share is ${perUsergasBillCharge}. Check your invoices.`);

    return result;
}

/**
 * Distribute a platform fee equally among all users.
 * Each active user's `platformFee` field is updated.
 *
 * @param {Object} updateData - Contains the platformFee amount.
 * @returns {Promise<Object>} - Result of the update operation.
 */
async function updatePlatformFee(updateData) {
    const { platformFee } = updateData;

    if (typeof platformFee !== 'number' || isNaN(platformFee) || platformFee < 0) {
        throw new AppError('platformFee must be a valid non‑negative number', 400);
    }
    
    // Applying to ALL users (like cookingCharge) since platform fee is a generic fee per person
    const result = await User.updateMany(
        {}, 
        { $set: { platformFee } },
        { runValidators: true }
    );

    await notificationService.sendToAllActiveUsers('BILLING', 'Platform Fee Updated', `The platform fee has been updated to ${platformFee}.`);

    return result;
}

module.exports = {
    updateGuestMealCharge,
    updateCookingCharge,
    updateWaterBill,
    updateGasBillCharge,
    updatePlatformFee
}