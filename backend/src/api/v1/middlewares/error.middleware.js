const logger = require('../../../utils/logger/index');
const config = require('../../../config/index');

const errorMiddleware = (err, req, res, next) => {
    if (res.headersSent) return next(err);
    let error = { ...err };
    error.message = err.message;

    // Multer errors (file too large, unexpected field, etc.)
    if (err.name === 'MulterError') {
        const statusCode = 400;
        const multerMessages = {
            LIMIT_FILE_SIZE: 'File size exceeds the maximum allowed limit (5MB).',
            LIMIT_FIELD_KEY: 'Field name too long.',
            LIMIT_FIELD_VALUE: 'Field value too long.',
            LIMIT_FIELD_COUNT: 'Too many fields.',
            LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
        };
        error = { statusCode, message: multerMessages[err.code] || err.message };
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found`;
        error = { statusCode: 404, message };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        if (err.keyPattern?.date) {
            error = { statusCode: 409, message: 'This date is already taken by another member' };
        } else {
            const message = 'Duplicate field value entered';
            error = { statusCode: 400, message };
        }
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map((val) => val.message);
        error = { statusCode: 400, message };
    }

    const statusCode = error.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV === 'development' && config.app.env === 'development';
    if (statusCode >= 500) {
        logger.error('Server request failed', { statusCode, name: err.name, code: err.code });
    }

    res.status(statusCode).json({
        success: false,
        error: statusCode >= 500 && !isDevelopment ? 'Server Error' : error.message || 'Server Error',
        stack: isDevelopment ? err.stack : undefined,
    });
};

module.exports = errorMiddleware;
