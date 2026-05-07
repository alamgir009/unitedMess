const asyncHandler = require('../../../utils/helpers/asyncHandler');
const authService = require('../../../services/auth.service');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const AppError = require('../../../utils/errors/AppError');

// Cookie config helper
// SameSite=Strict: refresh cookie is never sent in cross-site contexts → CSRF-immune without tokens.
// SameSite=Lax in development so the cookie works on localhost (http).
const getCookieOptions = (maxAge) => {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        httpOnly: true,           // Invisible to JavaScript — XSS-proof
        secure: isProduction,     // HTTPS only in production
        sameSite: isProduction ? 'strict' : 'lax', // Strict = no cross-site sends → CSRF-proof
        maxAge,
        path: '/',
    };
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
    const { user } = await authService.register(req.body);

    sendSuccessResponse(res, 201, 'User registered successfully. Please check your email for verification.', {
        user,
    });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const { user, tokens } = await authService.login(email, password, ip, userAgent);

    res.cookie('refreshToken', tokens.refresh.token, getCookieOptions(7 * 24 * 60 * 60 * 1000));
    res.cookie('accessToken', tokens.access.token, getCookieOptions(24 * 60 * 60 * 1000));

    // Also return tokens in body — required for cross-origin deployments where
    // SameSite=None cookies are blocked by Chrome's third-party cookie policy.
    sendSuccessResponse(res, 200, 'Login successful', {
        user,
        tokens: {
            accessToken: tokens.access.token,
            refreshToken: tokens.refresh.token,
        },
    });
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
        await authService.logout(refreshToken);
    }

    const clearOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
    };

    res.clearCookie('refreshToken', clearOptions);
    res.clearCookie('accessToken', clearOptions);

    sendSuccessResponse(res, 200, 'Logout successful');
});

// @desc    Refresh tokens
// @route   POST /api/v1/auth/refresh-token
// @access  Public
// Security:
//   - Refresh token is read exclusively from the httpOnly cookie (never from body/localStorage).
//   - New refresh token is issued via Set-Cookie (rotation). Old token is deleted by tokenService.
//   - User is returned in the body so the frontend can restore Redux state in one round-trip.
exports.refreshTokens = asyncHandler(async (req, res) => {
    // Prefer the httpOnly cookie; fall back to body only for non-browser clients (e.g. Postman).
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        const AppError = require('../../../utils/errors/AppError');
        throw new AppError('Refresh token is required', 401);
    }

    // Validate, rotate, and issue new token pair
    const tokens = await authService.refreshAuth(refreshToken);

    // Resolve the user from the newly-issued access token payload
    const User = require('../../../models/User.model');
    const jwt = require('jsonwebtoken');
    const config = require('../../../config');
    let user = null;
    try {
        const payload = jwt.verify(tokens.access.token, config.jwt.secret);
        user = await User.findById(payload.sub).lean();
        if (user) {
            // Strip sensitive fields before sending to client
            delete user.password;
            delete user.loginAttempts;
            delete user.lockUntil;
            delete user.passwordResetToken;
            delete user.passwordResetExpires;
            delete user.emailVerificationToken;
            delete user.emailVerificationExpires;
        }
    } catch (_) {
        // Non-fatal: client can still use the access token; user hydration just won't happen
    }

    // Rotate refresh token cookie — httpOnly so JS cannot read it
    res.cookie('refreshToken', tokens.refresh.token, getCookieOptions(7 * 24 * 60 * 60 * 1000));
    // Access token cookie kept for server-side rendering fallback only
    res.cookie('accessToken', tokens.access.token, getCookieOptions(24 * 60 * 60 * 1000));

    // Return accessToken + user in body — frontend stores accessToken in-memory (NOT localStorage)
    sendSuccessResponse(res, 200, 'Tokens refreshed successfully', {
        tokens: {
            accessToken: tokens.access.token,
            // Never return refreshToken in body — it lives only in the httpOnly cookie
        },
        user,
    });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    sendSuccessResponse(res, 200, 'Password reset link sent to email');
});

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
    await authService.resetPassword(req.params.token, req.body.password);
    sendSuccessResponse(res, 200, 'Password reset successful');
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res) => {
    await authService.verifyEmail(req.params.token);
    sendSuccessResponse(res, 200, 'Email verified successfully');
});

// @desc    Resend verification email
// @route   POST /api/v1/auth/resend-verification
// @access  Public
exports.resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required', 400);
    await authService.resendVerificationEmailByEmail(email);
    sendSuccessResponse(res, 200, 'Verification email resent successfully');
});

// @desc    Change password
// @route   POST /api/v1/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    sendSuccessResponse(res, 200, 'Password changed successfully');
});