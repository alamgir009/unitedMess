const crypto = require('crypto');
const User = require('../models/User.model');
const tokenService = require('./token.service');
const emailService = require('./email.service');
const AppError = require('../utils/errors/AppError');
const { validatePassword } = require('../utils/validators/common.validator.js');

const LOCK_THRESHOLD = 5;
const LOCK_TIME_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user and tokens
 */
async function register(userData) {
    const { email, password, name, phone } = userData;

    // Validate password strength (business logic)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        throw new AppError(passwordValidation.message, 400);
    }

    // Check if email is already taken
    const emailTaken = await User.isEmailTaken(email);
    if (emailTaken) {
        throw new AppError('Email already registered', 409);
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        phone,
        userStatus: 'pending'
    });

    // Generate email verification token
    const verificationToken = createEmailVerificationToken(user);
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationToken);

    // Generate auth tokens
    const tokens = await tokenService.generateAuthTokens(user);

    return { user, tokens };
}

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} ip - Request IP address
 * @param {string} userAgent - User agent string
 * @returns {Promise<Object>} User and tokens
 */
async function login(email, password, ip, userAgent) {
    // Find user with password field
    const user = await User.findOne({ email: email.toLowerCase() })
        .select('+password +loginAttempts +lockUntil')
        .collation({ locale: 'en', strength: 2 });

    if (!user) {
        throw new AppError('Invalid email or password', 401);
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
        throw new AppError(
            'Account is locked due to too many failed login attempts. Please try again later.',
            423
        );
    }

    // Check if account is active
    if (!user.isActive) {
        throw new AppError('Account is not active', 403);
    }

    // Check if account is approved
    if (user.userStatus !== 'approved') {
        throw new AppError('Account is not approved yet', 403);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        // Increment login attempts
        await incrementLoginAttempts(user._id);
        throw new AppError('Invalid email or password', 401);
    }

    // Reset login attempts on successful login
    await resetLoginAttempts(user._id);

    // Update last login info
    user.lastLogin = new Date();
    user.lastLoginIP = ip;
    user.lastLoginUA = userAgent;
    await user.save();

    // Generate tokens
    const tokens = await tokenService.generateAuthTokens(user);

    // Remove sensitive fields
    user.password = undefined;
    user.loginAttempts = undefined;
    user.lockUntil = undefined;

    return { user, tokens };
}

/**
 * Logout user
 * @param {string} refreshToken - Refresh token
 */
async function logout(refreshToken) {
    await tokenService.revokeToken(refreshToken);
}

/**
 * Refresh authentication tokens
 * @param {string} refreshToken - Current refresh token
 * @returns {Promise<Object>} New tokens
 */
async function refreshAuth(refreshToken) {
    const tokens = await tokenService.refreshAuthTokens(refreshToken);
    return tokens;
}

/**
 * Send password reset email
 * @param {string} email - User email
 */
async function forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() })
        .collation({ locale: 'en', strength: 2 });

    if (!user) {
        // Don't reveal if email exists (security best practice)
        return;
    }

    // Generate reset token
    const resetToken = createPasswordResetToken(user);
    await user.save({ validateBeforeSave: false });

    // Send reset email
    try {
        await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
        // Rollback token generation if email fails
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        throw new AppError('Error sending password reset email', 500);
    }
}

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 */
async function resetPassword(token, newPassword) {
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
        throw new AppError(passwordValidation.message, 400);
    }

    // Hash token and find user
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
        throw new AppError('Token is invalid or has expired', 400);
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Send confirmation email
    await emailService.sendPasswordResetConfirmation(user.email);
}

/**
 * Verify email with token
 * @param {string} token - Verification token
 */
async function verifyEmail(token) {
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() }
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
        throw new AppError('Token is invalid or has expired', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name);
}

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 */
async function changePassword(userId, currentPassword, newPassword) {
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
        throw new AppError(passwordValidation.message, 400);
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 401);
    }

    // Check if new password is same as old
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
        throw new AppError('New password must be different from current password', 400);
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Send notification email
    await emailService.sendPasswordChangeNotification(user.email);

    // Revoke all existing tokens (force re-login)
    await tokenService.revokeAllUserTokens(userId);
}

/**
 * Resend email verification
 * @param {string} userId - User ID
 */
async function resendVerificationEmail(userId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    if (user.isEmailVerified) {
        throw new AppError('Email is already verified', 400);
    }

    // Generate new verification token
    const verificationToken = createEmailVerificationToken(user);
    await user.save({ validateBeforeSave: false });

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationToken);
}

/**
 * Check if user can request password reset (rate limiting logic)
 * @param {string} email - User email
 * @returns {Promise<boolean>} Whether reset can be requested
 */
async function canRequestPasswordReset(email) {
    const user = await User.findOne({ email: email.toLowerCase() })
        .collation({ locale: 'en', strength: 2 });

    if (!user) {
        return true; // Allow request even if user doesn't exist (security measure)
    }

    // Check if a reset was recently requested (within last 15 minutes)
    if (user.passwordResetExpires && user.passwordResetExpires > Date.now() - 15 * 60 * 1000) {
        throw new AppError('Please wait before requesting another password reset', 429);
    }

    return true;
}

// ==================== PRIVATE HELPER FUNCTIONS ====================

/**
 * Check if account is locked
 * @private
 */
function isAccountLocked(user) {
    return !!(user.lockUntil && user.lockUntil > Date.now());
}

/**
 * Increment login attempts and lock if threshold reached
 * @private
 */
async function incrementLoginAttempts(userId) {
    const user = await User.findById(userId).select('+loginAttempts +lockUntil');

    if (!user) return;

    // Reset attempts if lock has expired
    if (user.lockUntil && user.lockUntil < Date.now()) {
        user.loginAttempts = 1;
        user.lockUntil = undefined;
        await user.save();
        return;
    }

    user.loginAttempts = (user.loginAttempts || 0) + 1;

    // Lock account after threshold
    if (user.loginAttempts >= LOCK_THRESHOLD && !isAccountLocked(user)) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);

        // Send lock notification email
        const fullUser = await User.findById(userId);
        if (fullUser) {
            await emailService.sendAccountLockedEmail(fullUser.email).catch(() => { });
        }
    }

    await user.save();
}

/**
 * Reset login attempts
 * @private
 */
async function resetLoginAttempts(userId) {
    await User.findByIdAndUpdate(userId, {
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
}

/**
 * Create password reset token
 * @private
 */
function createPasswordResetToken(user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    return resetToken;
}

/**
 * Create email verification token
 * @private
 */
function createEmailVerificationToken(user) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return verificationToken;
}

module.exports = {
    register,
    login,
    logout,
    refreshAuth,
    forgotPassword,
    resetPassword,
    verifyEmail,
    changePassword,
    resendVerificationEmail,
    canRequestPasswordReset
};