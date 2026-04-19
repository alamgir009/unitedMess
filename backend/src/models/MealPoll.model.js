const mongoose = require('mongoose');

const mealPollSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['day', 'night', 'both', 'off'],
            required: true,
        },
        date: {
            type: Date,
            required: true,
            // We store the date without time to represent the specific day
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying. We often want the latest vote per user.
mealPollSchema.index({ user: 1, date: -1 });
// Compound index to quickly get all votes for a specific day
mealPollSchema.index({ date: 1 });

const MealPoll = mongoose.model('MealPoll', mealPollSchema);

module.exports = MealPoll;
