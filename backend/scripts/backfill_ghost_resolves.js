/**
 * backfill_ghost_resolves.js
 *
 * The Unresolved Bills panel's payment path historically mutated ONLY the
 * invoice (paidAmount + status) without creating a Payment record — unlike
 * the refund path. Those "ghost resolves" left invoices marked paid with no
 * completed mess_bill payment to back the amount, so:
 *   - no payment history existed (Payments page / member history / PDF), and
 *   - any later syncInvoiceStatus / syncInvoiceAfterPayment recomputed
 *     paidAmount from Payment records → 0 and silently reverted the invoice
 *     to unpaid.
 *
 * This script finds every invoice where paidAmount exceeds the sum of its
 * completed mess_bill payments by more than the ₹1 settlement tolerance and
 * creates the missing completed Payment for the gap.
 *
 * Run:
 *   node scripts/backfill_ghost_resolves.js          # REPORT ONLY
 *   node scripts/backfill_ghost_resolves.js --apply  # WRITE changes
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Payment = require('../src/models/Payment.model');
const Invoice = require('../src/models/Invoice.model');
const User = require('../src/models/User.model');

const APPLY = process.argv.includes('--apply');
const TOLERANCE = 1; // same ₹1 tolerance that settles invoices

(async () => {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(`Connected to DB — ${APPLY ? 'MODE: APPLY (writes enabled)' : 'MODE: report only (pass --apply to write)'}\n`);

    const admin = await User.findOne({ role: 'admin', isActive: true }).select('_id name').lean();
    if (!admin) throw new Error('No active admin user found for createdBy');

    const invoices = await Invoice.find({ paidAmount: { $gt: 0 } })
        .select('user monthName totalPayable paidAmount status')
        .lean();

    const ghosts = [];
    for (const inv of invoices) {
        const agg = await Payment.aggregate([
            { $match: { user: inv.user, month: inv.monthName, status: 'completed', type: 'mess_bill' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const recorded = agg[0]?.total || 0;
        const gap = Math.round((inv.paidAmount - recorded) * 100) / 100;
        if (gap > TOLERANCE) ghosts.push({ inv, gap });
    }

    const userIds = [...new Set(ghosts.map((g) => String(g.inv.user)))];
    const users = userIds.length
        ? await User.find({ _id: { $in: userIds } }).select('name').lean()
        : [];
    const nameOf = (id) => (users.find((u) => String(u._id) === String(id)) || {}).name || String(id);

    if (ghosts.length === 0) {
        console.log('No ghost resolves found — every paidAmount is backed by payment records.');
        await mongoose.disconnect();
        return;
    }

    console.table(ghosts.map((g) => ({
        member: nameOf(g.inv.user),
        month: g.inv.monthName,
        invoiceStatus: g.inv.status,
        paidAmount: g.inv.paidAmount,
        backfillAmount: g.gap,
    })));
    console.log(`${ghosts.length} ghost invoice(s) found.`);

    if (!APPLY) {
        console.log('\nReport only — no writes performed. Re-run with --apply to backfill.');
        await mongoose.disconnect();
        return;
    }

    let created = 0;
    for (const g of ghosts) {
        await Payment.create({
            user: g.inv.user,
            amount: g.gap,
            month: g.inv.monthName,
            type: 'mess_bill',
            status: 'completed',
            paymentMethod: 'cash',
            createdBy: admin._id,
            remarks: `Payment of ₹ ${g.gap.toLocaleString('en-IN', { maximumFractionDigits: 2 })} recorded by admin (backfill — panel resolve created no payment record)`,
        });
        console.log(`[BACKFILLED] ${nameOf(g.inv.user)} · ${g.inv.monthName} · ₹${g.gap}`);
        created += 1;
    }

    console.log(`\n=== Backfill Complete ===\nRecords created: ${created}`);
    await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
