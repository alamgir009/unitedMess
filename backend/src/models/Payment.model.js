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
            enum: ['pending', 'pending_verification', 'completed', 'failed', 'refunded'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'online', 'razorpay', 'upi_manual'],
            default: 'cash',
        },
        transactionId: {
            type: String,
        },
        utr: {
            type: String,
            comment: "Raw user-submitted UTR for manual UPI payments (preserved for audit)",
        },
        receiptUrl: {
            type: String,
        },
        remarks: {
            type: String,
            trim: true,
        },
        gatewayFee: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        verifiedAt: {
            type: Date,
            default: null,
        },
        adminRemarks: {
            type: String,
            trim: true,
            default: '',
        },
        statusHistory: [
            {
                status: {
                    type: String,
                    enum: ['pending', 'pending_verification', 'completed', 'failed', 'refunded'],
                    required: true,
                },
                changedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                changedAt: {
                    type: Date,
                    default: Date.now,
                },
                remarks: {
                    type: String,
                    trim: true,
                    default: '',
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

paymentSchema.index({ user: 1, month: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ utr: 1 }, { sparse: true });
paymentSchema.index({ user: 1, month: 1, type: 1, status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
