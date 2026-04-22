const http = require('http');
const app = require('./app');
const config = require('./config/index');
const connectDB = require('./database/connection');
const logger = require('./utils/logger/index');
const { registerInvoiceCron } = require('./jobs/cron/invoiceCron');
const { setupSocketIO } = require('./sockets');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with the HTTP server
setupSocketIO(server);

// Connect to MongoDB
connectDB().then(() => {
    registerInvoiceCron();
});

// Start server
const PORT = config.app.port || 8080;

server.listen(PORT, () => {
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