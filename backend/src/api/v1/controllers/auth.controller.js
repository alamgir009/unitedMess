const asyncHandler = require('../../../utils/helpers/asyncHandler');
const authService = require('../../../services/auth.service');
const tokenService = require('../../../services/token.service');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
    const { user, tokens } = await authService.register(req.body);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refresh.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set access token in httpOnly cookie
    res.cookie('accessToken', tokens.access.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes (or whatever the expiry is)
    });

    sendSuccessResponse(res, 201, 'User registered successfully', {
        user,
    });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    // Get IP and User-Agent for login tracking
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const { user, tokens } = await authService.login(email, password, ip, userAgent);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refresh.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set access token in httpOnly cookie
    res.cookie('accessToken', tokens.access.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    sendSuccessResponse(res, 200, 'Login successful', {
        user,
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

    res.clearCookie('refreshToken');

    sendSuccessResponse(res, 200, 'Logout successful');
});

// @desc    Refresh tokens
// @route   POST /api/v1/auth/refresh-token
// @access  Public
exports.refreshTokens = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    const tokens = await authService.refreshAuth(refreshToken);

    res.cookie('refreshToken', tokens.refresh.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Set access token in httpOnly cookie
    res.cookie('accessToken', tokens.access.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    sendSuccessResponse(res, 200, 'Tokens refreshed successfully');
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);

    sendSuccessResponse(
        res,
        200,
        'Password reset link sent to email'
    );
});

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
    await authService.resetPassword(
        req.params.token,
        req.body.password
    );

    sendSuccessResponse(res, 200, 'Password reset successful');
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res) => {
    await authService.verifyEmail(req.params.token);

    sendSuccessResponse(res, 200, 'Email verified successfully');
});

// @desc    Change password
// @route   POST /api/v1/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
    );

    sendSuccessResponse(res, 200, 'Password changed successfully');
});
