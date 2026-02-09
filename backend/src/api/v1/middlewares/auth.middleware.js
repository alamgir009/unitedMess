const jwt = require('jsonwebtoken');
const asyncHandler = require('../../../utils/helpers/asyncHandler');
const User = require('../../../models/User.model');
const AppError = require('../../../utils/errors/AppError');
const config = require('../../../config/index');

exports.protect = asyncHandler(async (req, res, next) => {
    // Get token from header
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(
            new AppError('You are not logged in. Please log in to get access.', 401)
        );
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Check if user still exists
        const user = await User.findById(decoded.sub || decoded.id).select('+password');
        if (!user) {
            return next(
                new AppError('The user belonging to this token no longer exists.', 401)
            );
        }

        // Check if user is active
        if (!user.isActive) {
            return next(new AppError('Your account has been deactivated.', 403));
        }

        // Check if user changed password after token was issued
        if (user.changedPasswordAfter(decoded.iat)) {
            return next(
                new AppError('User recently changed password. Please log in again.', 401)
            );
        }

        // Grant access to protected route
        req.user = user;
        next();
    } catch (err) {
        return next(new AppError('Invalid token. Please log in again.', 401));
    }
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
