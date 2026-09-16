const mongoose = require('mongoose');

const marketSchema = new mongoose.Schema(
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
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        items: {
            type: String,
            required:true,
            trim:true,
        },
        image: {
            type: String, // URL to receipt or image
        },
        description: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Normalize date to midnight UTC for consistent unique index behavior
marketSchema.pre('validate', function (next) {
    if (this.date && this.isModified('date')) {
        this.date = new Date(Date.UTC(
            this.date.getUTCFullYear(),
            this.date.getUTCMonth(),
            this.date.getUTCDate()
        ));
    }
    next();
});

marketSchema.index({ date: -1 });
marketSchema.index({ user: 1 });
marketSchema.index({ user: 1, date: 1 }, { unique: true });

const Market = mongoose.model('Market', marketSchema);

module.exports = Market;
