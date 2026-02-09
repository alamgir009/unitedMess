const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        paymentDate: {
            type: Date,
            default: Date.now,
        },
        month: {
            type: String, // e.g., "January 2024"
            required: true,
        },
        type: {
            type: String, // 'mess_bill', 'extra', 'gas', etc.
            enum: ['mess_bill', 'gas_bill', 'other'],
            default: 'mess_bill',
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'online', 'razorpay'],
            default: 'cash',
        },
        transactionId: {
            type: String,
        },
        receiptUrl: {
            type: String,
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

paymentSchema.index({ user: 1, month: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
