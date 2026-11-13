const mongoose = require('mongoose');

/**
 * Overdue-penalty configuration — a SINGLETON document (same pattern as
 * UpiConfig): there is exactly one row that holds the global daily penalty
 * rate. Per-bill rates are snapshotted onto the Invoice itself.
 */
const penaltyConfigSchema = new mongoose.Schema(
    {
        dailyRate: {
            type: Number,
            default: 100,
            min: [0, 'Daily penalty rate cannot be negative'],
            comment: '₹ charged per overdue calendar day (IST), flat — no compounding',
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const PenaltyConfig = mongoose.model('PenaltyConfig', penaltyConfigSchema);
module.exports = PenaltyConfig;
