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
        items: [
            {
                name: String,
                price: Number,
                quantity: String,
            }
        ],
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

marketSchema.index({ date: -1 });
marketSchema.index({ user: 1 });

const Market = mongoose.model('Market', marketSchema);

module.exports = Market;
