/**
 * repair-refund-settlement.js
 *
 * One-time repair of refund bookkeeping so the Unresolved Bills panel and
 * member dashboards reflect REALITY (agreed with the admin):
 *
 *  1. DELETE fabricated "Auto-refund … user credited during finalization"
 *     records — created by the finalization cron WITHOUT any payout. Their
 *     existence made fully-unsettled refund-due bills invisible to the
 *     admin and falsely showed "Refunded" to members who got no money.
 *     (finalizeMonth/syncInvoiceStatus no longer create these.)
 *
 *  2. NORMALIZE legacy rows that violate model validation:
 *       Payment.amount < 0 (refunded)  → |amount|  (status carries the sign)
 *       Invoice.paidAmount < 0 on a negative-payable invoice → 0
 *
 *  3. REPAIR stale invoice status: totalPayable < 0 but status is still
 *     'unpaid' (old flows recorded a refund without syncing the invoice,
 *     e.g. July 2026) → 'refunded' (credit owed / recorded).
 *
 * Formulas mirror invoiceService.computeRefundCredit / determineInvoiceStatus
 * — kept local so this script only needs models (no email/pdf service graph).
 *
 * Run:
 *   node scripts/repair-refund-settlement.js          # REPORT ONLY
 *   node scripts/repair-refund-settlement.js --apply  # WRITE changes
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Payment = require('../src/models/Payment.model');
const Invoice = require('../src/models/Invoice.model');

const APPLY = process.argv.includes('--apply');

(async () => {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(`Connected to DB — ${APPLY ? 'MODE: APPLY (writes enabled)' : 'MODE: report only (pass --apply to write)'}\n`);

    /* ── 1. Fabricated auto-refund records ─────────────────────────────── */
    const autoRefunds = await Payment.find({
        status: 'refunded',
        remarks: /^Auto-refund/,
    }).select('user month amount type remarks createdAt').lean();

    /* ── 2a. Legacy negative refund amounts ────────────────────────────── */
    const negativeRefundPayments = await Payment.find({
        status: 'refunded',
        amount: { $lt: 0 },
    }).select('user month amount type remarks').lean();

    /* ── 2b. Legacy negative paidAmount on refund-credit invoices ─────── */
    const negativePaidInvoices = await Invoice.find({
        totalPayable: { $lt: 0 },
        paidAmount: { $lt: 0 },
    }).select('user monthName totalPayable paidAmount status').lean();

    /* ── 3. Stale status: negative payable not marked 'refunded' ──────── */
    const staleStatusInvoices = await Invoice.find({
        totalPayable: { $lt: 0 },
        status: { $ne: 'refunded' },
    }).select('user monthName totalPayable paidAmount status').lean();

    const summary = {
        'auto-refund records to delete': autoRefunds.length,
        'negative refund amounts to normalize': negativeRefundPayments.length,
        'negative paidAmount to zero': negativePaidInvoices.length,
        'stale invoice status to repair': staleStatusInvoices.length,
    };
    console.table(summary);

    if (autoRefunds.length) {
        console.log('\n[1] Fabricated auto-refund records (will be DELETED):');
        console.table(autoRefunds.map(r => ({
            month: r.month,
            amount: r.amount,
            type: r.type,
            remarks: (r.remarks || '').slice(0, 60),
        })));
    }
    if (negativeRefundPayments.length) {
        console.log('\n[2a] Legacy negative refund amounts (→ |amount|):');
        console.table(negativeRefundPayments.map(r => ({
            month: r.month,
            amount: r.amount,
            to: Math.abs(r.amount),
            type: r.type,
        })));
    }
    if (negativePaidInvoices.length) {
        console.log('\n[2b] Negative paidAmount on refund-credit invoices (→ 0):');
        console.table(negativePaidInvoices.map(i => ({
            month: i.monthName,
            totalPayable: i.totalPayable,
            paidAmount: i.paidAmount,
            status: i.status,
        })));
    }
    if (staleStatusInvoices.length) {
        console.log('\n[3] Stale invoice status (totalPayable < 0 → refunded):');
        console.table(staleStatusInvoices.map(i => ({
            month: i.monthName,
            totalPayable: i.totalPayable,
            paidAmount: i.paidAmount,
            storedStatus: i.status,
            to: 'refunded',
        })));
    }

    const totalChanges = autoRefunds.length + negativeRefundPayments.length
        + negativePaidInvoices.length + staleStatusInvoices.length;

    if (totalChanges === 0) {
        console.log('\nNothing to repair — refund settlement already consistent.');
        await mongoose.disconnect();
        return;
    }

    if (!APPLY) {
        console.log(`\nReport only — ${totalChanges} change(s) pending. Re-run with --apply to write.`);
        await mongoose.disconnect();
        return;
    }

    let written = 0;

    for (const r of autoRefunds) {
        await Payment.deleteOne({ _id: r._id });
        console.log(`[DELETED] auto-refund ${r.month} ₹${r.amount} (${r.type})`);
        written += 1;
    }

    for (const r of negativeRefundPayments) {
        await Payment.updateOne({ _id: r._id }, { $set: { amount: Math.abs(r.amount) } });
        console.log(`[NORMALIZED] refund ${r.month}: amount ${r.amount} → ${Math.abs(r.amount)}`);
        written += 1;
    }

    for (const i of negativePaidInvoices) {
        await Invoice.updateOne({ _id: i._id }, { $set: { paidAmount: 0 } });
        console.log(`[NORMALIZED] invoice ${i.monthName}: paidAmount ${i.paidAmount} → 0`);
        written += 1;
    }

    for (const i of staleStatusInvoices) {
        await Invoice.updateOne({ _id: i._id }, { $set: { status: 'refunded' } });
        console.log(`[REPAIRED] invoice ${i.monthName} (${i.totalPayable}): status ${i.status} → refunded`);
        written += 1;
    }

    console.log(`\n=== Apply Complete ===\nChanges written: ${written}`);
    await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
