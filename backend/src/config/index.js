const dotenv = require('dotenv');
const path = require('path');

// Load .env file — dotenv does NOT override existing process.env vars,
// so platform-level environment variables take precedence.
dotenv.config({ path: path.join(__dirname, '../../.env') });

// ─── Startup diagnostics ─────────────────────────────────────────────────────
// Log key Razorpay config info so admins can verify the correct source.
// Must run before any service modules that depend on config.
const RZ_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
if (RZ_KEY_ID) {
    const mode    = RZ_KEY_ID.startsWith('rzp_live_') ? 'LIVE' : RZ_KEY_ID.startsWith('rzp_test_') ? 'TEST' : 'INVALID';
    const dotenvLoaded = !!process.env.RAZORPAY_KEY_ID; // true if available
    // Detect if the value was already set before dotenv ran (platform override)
    // We can't perfectly detect this without saving a snapshot, but we can flag it.
    const prefix = RZ_KEY_ID.length > 9 ? RZ_KEY_ID.substring(0, 9) + '...' : RZ_KEY_ID;
    console.info(`[Config] RAZORPAY_KEY_ID=${prefix} mode=${mode} (loaded from ${dotenvLoaded ? 'process.env' : 'undefined'})`);
} else {
    console.warn('[Config] RAZORPAY_KEY_ID is NOT SET — Razorpay payments will fail.');
}

const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
module.exports = {
    app: {
        env: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 8080,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        backendUrl: process.env.BACKEND_URL || 'http://localhost:8080',
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
    },
    cors: {
        origin: [
            process.env.FRONTEND_URL,
            'https://unitedmess.uk',
            'https://unitedmess.pages.dev',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000'
        ].filter(Boolean),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    },
    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    },
    vapid: {
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY,
        subject: process.env.VAPID_SUBJECT || 'mailto:unitedmess96@gmail.com',
    },
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : undefined,
    },
};
