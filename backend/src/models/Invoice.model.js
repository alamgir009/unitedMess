const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        month: {
            type: Number, // 1-12
            required: true,
            min: [1, 'Month must be 1-12'],
            max: [12, 'Month must be 1-12'],
        },
        year: {
            type: Number,
            required: true,
            min: [2000, 'Year must be >= 2000'],
            max: [2100, 'Year must be <= 2100'],
        },
        monthName: {
            type: String, // e.g., "April 2024"
            required: true,
        },
        // Stats for the month
        mealCount: {
            type: Number,
            default: 0,
            min: [0, 'Meal count cannot be negative'],
        },
        guestMealCount: {
            type: Number,
            default: 0,
            min: [0, 'Guest meal count cannot be negative'],
        },
        marketAmountSpent: {
            type: Number,
            default: 0,
            min: [0, 'Market amount cannot be negative'],
            comment: "Total amount this user spent on markets this month",
        },
        // Shared costs
        mealRate: {
            type: Number,
            default: 0,
            min: [0, 'Meal rate cannot be negative'],
        },
        messCost: {
            type: Number,
            default: 0,
            min: [0, 'Mess cost cannot be negative'],
            comment: "mealRate * mealCount",
        },
        guestMealRevenue: {
            type: Number,
            default: 0,
            min: [0, 'Guest meal revenue cannot be negative'],
        },
        // Fixed costs at the time of invoice generation
        fixedCosts: {
            cookingCharge: { type: Number, default: 0, min: [0, 'Cooking charge cannot be negative'] },
            waterBill: { type: Number, default: 0, min: [0, 'Water bill cannot be negative'] },
            gasBillCharge: { type: Number, default: 0, min: [0, 'Gas bill charge cannot be negative'] },
            platformFee: { type: Number, default: 0, min: [0, 'Platform fee cannot be negative'] },
        },
        // Final calculation
        totalBill: {
            type: Number,
            default: 0,
            comment: "messCost + fixedCosts + guestRevenue - marketAmountSpent (can be negative when market spend exceeds costs — triggers refund flow)",
        },
        totalPayable: {
            type: Number,
            default: 0,
            comment: "totalBill (can be negative — determineInvoiceStatus maps < 0 to 'refunded')",
        },
        paidAmount: {
            type: Number,
            default: 0,
            min: [0, 'Paid amount cannot be negative'],
        },
        status: {
            type: String,
            enum: ['unpaid', 'partially_paid', 'paid', 'refunded'],
            default: 'unpaid',
        },
        isFinalized: {
            type: Boolean,
            default: false,
        },
        finalizedAt: {
            type: Date,
        },
        isExempt: {
            type: Boolean,
            default: false,
            comment: "True if user was activated after billing period start — not charged"
        },
        exemptReason: {
            type: String,
            default: null,
            comment: "Reason for billing exemption"
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate invoices for the same user/month/year
invoiceSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });
invoiceSchema.index({ status: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
