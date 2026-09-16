const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        mealCount: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        type: {
            type: String,
            enum: ['day', 'night', 'both', 'off'],
            default: 'both'
        },
        isGuestMeal: {
            type: Boolean,
            default: false
        },
        guestCount: {
            type: Number,
            default: 0,
            min: [0, 'Guest count cannot be negative'],
        },
        remarks: {
            type: String,
            trim: true,
        },
        source: {
            type: String,
            enum: ['manual', 'bulk', 'auto'],
            default: 'manual',
        },
    },
    {
        timestamps: true,
    }
);

// Normalize date to midnight UTC for consistent unique index behavior
mealSchema.pre('validate', function (next) {
    if (this.date && this.isModified('date')) {
        this.date = new Date(Date.UTC(
            this.date.getUTCFullYear(),
            this.date.getUTCMonth(),
            this.date.getUTCDate()
        ));
    }
    next();
});

// Enforce one-record-per-date-per-user at database level
mealSchema.index({ date: 1, user: 1 }, { unique: true });

const Meal = mongoose.model('Meal', mealSchema);

module.exports = Meal;
