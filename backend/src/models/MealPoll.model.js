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
            // Serves as effectiveFrom — the date from which this preference is active
        },
        effectiveUntil: {
            type: Date,
            default: null,
            // null = active indefinitely (the standing preference).
            // When a new vote supersedes this one, effectiveUntil is set
            // to the new vote's effectiveFrom (half-open interval: effectiveFrom <= D < effectiveUntil).
            // Legacy daily carry-forward records have effectiveUntil set to their own date
            // during the one-time migration (effectively closing them).
        },
        source: {
            type: String,
            enum: ['manual', 'carried_forward'],
            default: 'manual',
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

// Effective-dated standing preference query:
// resolveEffectiveVote(user, D) uses: date <= D AND (effectiveUntil is null OR effectiveUntil > D)
mealPollSchema.index({ user: 1, date: -1 });

// At most ONE active standing preference per user (effectiveUntil = null).
// Partial index only indexes documents where effectiveUntil is null.
mealPollSchema.index(
    { user: 1 },
    { unique: true, partialFilterExpression: { effectiveUntil: null } }
);

// Compound index to quickly get all votes for a specific effectiveFrom date
mealPollSchema.index({ date: 1 });

const MealPoll = mongoose.model('MealPoll', mealPollSchema);

module.exports = MealPoll;
