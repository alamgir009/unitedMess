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
        },
        year: {
            type: Number,
            required: true,
        },
        monthName: {
            type: String, // e.g., "April 2024"
            required: true,
        },
        // Stats for the month
        mealCount: {
            type: Number,
            default: 0,
        },
        guestMealCount: {
            type: Number,
            default: 0,
        },
        marketAmountSpent: {
            type: Number,
            default: 0,
            comment: "Total amount this user spent on markets this month",
        },
        // Shared costs
        mealRate: {
            type: Number,
            default: 0,
        },
        messCost: {
            type: Number,
            default: 0,
            comment: "mealRate * mealCount",
        },
        guestMealRevenue: {
            type: Number,
            default: 0,
        },
        // Fixed costs at the time of invoice generation
        fixedCosts: {
            cookingCharge: { type: Number, default: 0 },
            waterBill: { type: Number, default: 0 },
            gasBillCharge: { type: Number, default: 0 },
            platformFee: { type: Number, default: 0 },
        },
        // Final calculation
        totalBill: {
            type: Number,
            default: 0,
            comment: "messCost + fixedCosts + guestRevenue - marketAmountSpent",
        },
        dueCarryOver: {
            type: Number,
            default: 0,
            comment: "Unpaid balance from previous finalized invoice",
        },
        totalPayable: {
            type: Number,
            default: 0,
            comment: "totalBill + dueCarryOver",
        },
        paidAmount: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['unpaid', 'partially_paid', 'paid'],
            default: 'unpaid',
        },
        isFinalized: {
            type: Boolean,
            default: false,
        },
        finalizedAt: {
            type: Date,
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
