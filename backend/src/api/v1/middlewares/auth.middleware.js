const asyncHandler = require('../../../utils/helpers/asyncHandler');
const User = require('../../../models/User.model');
const AppError = require('../../../utils/errors/AppError');
const { verifyAccessToken } = require('../../../services/token.service');

exports.protect = asyncHandler(async (req, res, next) => {
    // Get token from header or cookie
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }

    if (!token) {
        return next(
            new AppError('You are not logged in. Please log in to get access.', 401)
        );
    }

    let decoded;
    try {
        decoded = verifyAccessToken(token);
    } catch {
        return next(new AppError('Invalid token. Please log in again.', 401));
    }

    const user = await User.findById(decoded.sub || decoded.id);
    if (!user) {
        return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    if (!user.isActive) {
        return next(new AppError('Your account has been deactivated.', 403));
    }

    if (user.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed password. Please log in again.', 401));
    }

    req.user = user;
    next();
});

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError('You do not have permission to perform this action', 403)
            );
        }
        next();
    };
};
