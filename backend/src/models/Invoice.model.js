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
        // ── Overdue penalty ──────────────────────────────────────────────
        // Money stays in the existing rupee-Number representation; all
        // arithmetic happens in integer paise inside penalty.service.
        dueDate: {
            type: Date,
            default: null,
            comment: "5th of the month AFTER the billing month, 23:59:59 IST inclusive — penalty starts on the 6th",
        },
        penaltyRateSnapshot: {
            type: Number,
            default: null,
            min: [0, 'Penalty rate cannot be negative'],
            comment: "₹/day frozen when this bill first became overdue (global rate at that moment, or an admin override)",
        },
        penaltyWaivedAmount: {
            type: Number,
            default: 0,
            min: [0, 'Waived amount cannot be negative'],
            comment: "Admin-granted waiver against the accrued penalty (reversible by admin)",
        },
        waiverReason: {
            type: String,
            default: null,
            comment: "Mandatory reason captured when the waiver was granted",
        },
        waivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        waivedAt: {
            type: Date,
            default: null,
        },
        penaltyAuditLog: {
            type: [{
                action: {
                    type: String,
                    enum: ['snapshot', 'rate_override', 'waive', 'unwaive'],
                    required: true,
                },
                actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
                oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
                newValue: { type: mongoose.Schema.Types.Mixed, default: null },
                reason: { type: String, default: null },
                at: { type: Date, default: Date.now },
            }],
            default: [],
            comment: "Append-only audit trail — never mutated, only $pushed",
        },
        // ── Billing exemption ────────────────────────────────────────────
        // isExempt / exemptReason are the DENORMALIZED EFFECTIVE values
        // produced by billingExemption.service.resolveExemption(). They are
        // what every read path (list, batch, badge, payable) consumes.
        //
        // exemptOverride is the ADMIN'S EXPLICIT INTENT and is the only
        // field that can change the outcome when activity data says
        // otherwise:
        //   'none'         → automatic (zero-activity) rule applies
        //   'force_exempt' → exempt even if the member had activity
        //   'force_bill'   → billed even if the member had no activity
        //
        // There is deliberately NO date-based (activatedAt/createdAt)
        // exemption anywhere in this schema or the codebase.
        isExempt: {
            type: Boolean,
            default: false,
            comment: "Effective flag: true when the member pays ₹0 for this period"
        },
        exemptReason: {
            type: String,
            default: null,
            comment: "Effective reason shown to admin/member"
        },
        exemptSource: {
            type: String,
            enum: ['manual', 'auto_no_activity', null],
            default: null,
            comment: "'manual' = set by an admin, 'auto_no_activity' = zero-activity rule"
        },
        exemptOverride: {
            type: String,
            enum: ['none', 'force_exempt', 'force_bill'],
            default: 'none',
            comment: "Admin intent. 'force_bill' is the escape hatch from the zero-activity rule"
        },
        exemptedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            comment: "Admin who last changed the exemption manually"
        },
        exemptedAt: {
            type: Date,
            default: null,
        },
        exemptHistory: {
            type: [{
                override: { type: String, enum: ['none', 'force_exempt', 'force_bill'] },
                reason: { type: String, default: null },
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                changedAt: { type: Date, default: Date.now },
            }],
            default: [],
            comment: "Immutable audit trail of manual exemption changes"
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate invoices for the same user/month/year
invoiceSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ month: 1, year: 1, status: 1 });
// Overdue queries: "which unpaid/partially-paid bills are past their due date"
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ user: 1, status: 1, dueDate: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
