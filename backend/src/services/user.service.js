const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const emailService = require('./email.service');

/**
 * Get user by ID
 * @param {string} userId
 */
async function getUserById(userId) {
    const user = await User.findById(userId)
        .populate('markets')
        .populate('meals');

    if (!user) {
        throw new AppError('User not found', 404);
    }

    return user;
}

/**
 * Update user profile
 * @param {string} userId
 * @param {Object} updateData
 */
async function updateProfile(userId, updateData) {
    const { email, phone, name, image } = updateData;

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Check if email is being changed and if it's taken
    if (email && email !== user.email) {
        const emailTaken = await User.isEmailTaken(email, userId);
        if (emailTaken) {
            throw new AppError('Email already in use', 409);
        }
        user.email = email;
        user.isEmailVerified = false; // Require re-verification
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (image !== undefined) user.image = image;

    await user.save();

    return user;
}

/**
 * Approve user account (admin only)
 * @param {string} userId
 * @param {string} approvedBy
 */
async function approveAccount(userId, approvedBy) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    if (user.userStatus === 'approved') {
        throw new AppError('User is already approved', 400);
    }

    user.userStatus = 'approved';
    user.deleteIfNotApproved = null;
    user.isActive = true;
    await user.save();

    // Send approval email
    await emailService.sendAccountApprovedEmail(user.email, user.name);

    return user;
}

/**
 * Deny user account (admin only)
 * @param {string} userId
 * @param {string} deniedBy
 * @param {string} reason
 */
async function denyAccount(userId, deniedBy, reason) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    user.userStatus = 'denied';
    user.isActive = false;
    user.deleteIfNotApproved = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    // Send denial email
    await emailService.sendAccountDeniedEmail(user.email, user.name, reason);

    return user;
}

/**
 * Update payment status
 * @param {string} userId
 * @param {string} status - 'pending' | 'success' | 'failed'
 */
async function updatePaymentStatus(userId, status) {
    if (!['pending', 'success', 'failed'].includes(status)) {
        throw new AppError('Invalid payment status', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    user.payment = status;
    await user.save();

    return user;
}

/**
 * Update gas bill status
 * @param {string} userId
 * @param {string} status - 'pending' | 'success' | 'failed'
 */
async function updateGasBillStatus(userId, status) {
    if (!['pending', 'success', 'failed'].includes(status)) {
        throw new AppError('Invalid gas bill status', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    user.gasBill = status;
    await user.save();

    return user;
}

/**
 * Deactivate user account
 * @param {string} userId
 */
async function deactivateAccount(userId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    user.isActive = false;
    await user.save();

    return user;
}

/**
 * Get all users with filters (admin only)
 * @param {Object} filters
 * @param {Object} pagination - { page, limit }
 */
async function getAllUsers(filters = {}, pagination = {}) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (filters.userStatus) query.userStatus = filters.userStatus;
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.payment) query.payment = filters.payment;

    const users = await User.find(query)
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return {
        users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
}

/**
 * Search users by name or email (admin only)
 * @param {string} searchTerm
 * @param {Object} pagination
 */
async function searchUsers(searchTerm, pagination = {}) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
        $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } }
        ]
    };

    const users = await User.find(query)
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return {
        users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
}

/**
 * Get user statistics (admin only)
 */
async function getUserStats() {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const approvedUsers = await User.countDocuments({ userStatus: 'approved' });
    const pendingUsers = await User.countDocuments({ userStatus: 'pending' });
    const deniedUsers = await User.countDocuments({ userStatus: 'denied' });

    // Get users by role
    const adminCount = await User.countDocuments({ role: 'admin' });
    const userCount = await User.countDocuments({ role: 'user' });

    // Get users by payment status
    const paymentPending = await User.countDocuments({ payment: 'pending' });
    const paymentSuccess = await User.countDocuments({ payment: 'success' });
    const paymentFailed = await User.countDocuments({ payment: 'failed' });

    return {
        totalUsers,
        activeUsers,
        userStatus: {
            approved: approvedUsers,
            pending: pendingUsers,
            denied: deniedUsers
        },
        roles: {
            admin: adminCount,
            user: userCount
        },
        paymentStatus: {
            pending: paymentPending,
            success: paymentSuccess,
            failed: paymentFailed
        }
    };
}
/**
 * Create user (admin only)
 * @param {Object} userBody
 */
async function createUser(userBody) {
    const { email, password, name, phone, role } = userBody;

    // Check if email is taken
    const emailTaken = await User.isEmailTaken(email);
    if (emailTaken) {
        throw new AppError('Email already registered', 409);
    }

    const user = await User.create({
        name,
        email,
        password,
        phone,
        role: role || 'user',
        userStatus: 'approved', // Admin created users are auto-approved
        isEmailVerified: true, // Auto-verified? Or require verification? Let's say auto-verified for now if admin creates.
        isActive: true
    });

    return user;
}

module.exports = {
    createUser,
    getUserById,
    updateProfile,
    approveAccount,
    denyAccount,
    updatePaymentStatus,
    updateGasBillStatus,
    deactivateAccount,
    getAllUsers,
    searchUsers,
    getUserStats
};