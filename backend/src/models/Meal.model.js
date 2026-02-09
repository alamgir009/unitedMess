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
            enum: ['day', 'night', 'both'],
            default: 'both'
        },
        isGuestMeal: {
            type: Boolean,
            default: false
        },
        guestCount: {
            type: Number,
            default: 0
        },
        remarks: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate meals for same user, date, and type? 
// Or allow multiple entries? Usually one entry per type per day per user is best.
// formatting date to YYYY-MM-DD for indexing might be better, but sticking to simple index for now.
mealSchema.index({ date: 1, user: 1, type: 1 });

const Meal = mongoose.model('Meal', mealSchema);

module.exports = Meal;
