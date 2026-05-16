const mongoose = require('mongoose');

const fcmTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true,
    },
    token: {
        type: String,
        required: [true, 'FCM token is required'],
        unique: true,
    },
    deviceInfo: {
        platform: { type: String, default: '' },
        userAgent: { type: String, default: '' },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastUsed: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

fcmTokenSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('FcmToken', fcmTokenSchema);