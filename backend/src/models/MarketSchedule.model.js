const mongoose = require('mongoose');

const marketScheduleSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: [true, 'Date is required'],
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },
        month: {
            type: Number,
            required: [true, 'Month is required'],
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: [true, 'Year is required'],
        },
        monthKey: {
            type: String,
            required: [true, 'MonthKey is required'],
        },
        source: {
            type: String,
            enum: ['user', 'admin', 'auto'],
            default: 'user',
        },
        status: {
            type: String,
            enum: ['active', 'reset', 'superseded'],
            default: 'active',
        },
        isManuallySelected: {
            type: Boolean,
            default: true,
        },
        googleCalendarEventId: {
            type: String,
            default: null,
        },
        googleSyncStatus: {
            type: String,
            enum: ['pending', 'synced', 'failed'],
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

marketScheduleSchema.index({ date: 1 }, { unique: true });
marketScheduleSchema.index({ monthKey: 1, date: 1 });
marketScheduleSchema.index({ user: 1, monthKey: 1 });
marketScheduleSchema.index(
    { status: 1, monthKey: 1 },
    { partialFilterExpression: { status: 'active' } }
);

const MarketSchedule = mongoose.model('MarketSchedule', marketScheduleSchema);

module.exports = MarketSchedule;
