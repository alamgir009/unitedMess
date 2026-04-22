const app = require('./app');
const config = require('./config/index');
const connectDB = require('./database/connection');
const logger = require('./utils/logger/index');
const { registerInvoiceCron } = require('./jobs/cron/invoiceCron');

// Connect to MongoDB
connectDB().then(() => {
    // Register cron jobs once DB is connected
    registerInvoiceCron();
});

// Start server
const PORT = config.app.port || 8080;

const server = app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} in ${config.app.env} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
    logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        logger.info('💥 Process terminated!');
    });
});

module.exports = server;
