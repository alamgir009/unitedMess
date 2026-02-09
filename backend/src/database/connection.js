const mongoose = require('mongoose');
const config = require('../config/index');
const logger = require('../utils/logger/index');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongoose.url, {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });

        logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error(`❌ MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('⚠️  MongoDB disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('👋 MongoDB connection closed through app termination');
            process.exit(0);
        });
    } catch (error) {
        logger.error(`❌ Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
