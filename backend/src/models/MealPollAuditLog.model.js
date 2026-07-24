const mongoose = require('mongoose');

const mealPollAuditLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        eventType: {
            type: String,
            enum: ['vote_created', 'vote_updated', 'vote_unchanged'],
            required: true,
        },
        pollDate: {
            type: Date,
            required: true,
        },
        previousState: {
            type: {
                type: String,
                enum: ['day', 'night', 'both', 'off', null],
                default: null,
            },
            updatedAt: {
                type: Date,
                default: null,
            },
        },
        newState: {
            type: {
                type: String,
                enum: ['day', 'night', 'both', 'off'],
                required: true,
            },
            updatedAt: {
                type: Date,
                required: true,
            },
        },
        timestamp: {
            type: Date,
            default: Date.now,
            required: true,
        },
        monthKey: {
            type: String,
            required: true,
        },
        dayKey: {
            type: String,
            required: true,
        },
        requestId: {
            type: String,
            sparse: true,
        },
    },
    {
        timestamps: false,
    }
);

mealPollAuditLogSchema.index({ monthKey: 1, timestamp: 1 });
mealPollAuditLogSchema.index({ dayKey: 1, timestamp: 1 });
mealPollAuditLogSchema.index(
    { requestId: 1 },
    { unique: true, sparse: true, partialFilterExpression: { requestId: { $exists: true } } }
);

const MealPollAuditLog = mongoose.model('MealPollAuditLog', mealPollAuditLogSchema);

module.exports = MealPollAuditLog;
