const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const apiV1Routes = require('./api/v1/routes');
const errorMiddleware = require('./api/v1/middlewares/error.middleware');
const { setupSocketIO } = require('./sockets');
const config = require('./config');

const app = express();

// Security middlewares
app.use(helmet());
app.use(mongoSanitize());

// CORS
app.use(cors(config.cors));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression
app.use(compression());

// API routes
app.use('/api/v1', apiV1Routes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Error handling middleware
app.use(errorMiddleware);

module.exports = app;
