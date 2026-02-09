const logger = require('../../../utils/logger/index');
const config = require('../../../config/index');

const errorMiddleware = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log Error
    logger.error(err);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found`;
        error = { statusCode: 404, message };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { statusCode: 400, message };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map((val) => val.message);
        error = { statusCode: 400, message };
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error',
        stack: config.app.env === 'development' ? err.stack : undefined,
    });
};

module.exports = errorMiddleware;
