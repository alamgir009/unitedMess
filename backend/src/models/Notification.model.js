const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Recipient is required'],
        index: true
    },
    type: {
        type: String,
        enum: [
            'PAYMENT', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL',
            'ACCOUNT', 'SECURITY', 'BILLING', 'SYSTEM',
            'INVESTMENT', 'REWARD', 'CUSTOM'
        ],
        required: [true, 'Notification type is required']
    },
    priority: {
        type: String,
        enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
        default: 'NORMAL'
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    message: {
        type: String,
        required: [true, 'Message is required']
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    },
    actionRequired: {
        type: Boolean,
        default: false
    },
    actionUrl: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    deliveryStatus: {
        type: String,
        enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED'],
        default: 'PENDING'
    },
    idempotencyKey: {
        type: String,
        unique: true,
        sparse: true
    },
    expiresAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1, priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
