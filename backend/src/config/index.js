const dotenv = require('dotenv');
const path = require('path');
// const {PORT} = require('../../.env')
dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
    app: {
        env: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 8080,
    },
    mongoose: {
        url: process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/mess',
        options: {
            // mongoose 6+ doesn't need these explicitly but good to be explicit if using older
        },
    },
    jwt: {
        secret: process.env.SECRET_KEY || process.env.JWT_SECRET || 'your_jwt_secret_key',
        accessExpirationMinutes: process.env.JWT_ACCESS_EXPIRATION_MINUTES || 30,
        refreshExpirationDays: process.env.JWT_REFRESH_EXPIRATION_DAYS || 7,
        resetPasswordExpirationMinutes: 10,
        verifyEmailExpirationMinutes: 10,
    },
    email: {
        smtp: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        },
        from: process.env.EMAIL_USER,
    },
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
    },
    vonage: {
        apiKey: process.env.VONAGE_API_KEY,
        apiSecret: process.env.VONAGE_API_SECRET,
        brandName: process.env.VONAGE_BRAND_NAME
    }
};
