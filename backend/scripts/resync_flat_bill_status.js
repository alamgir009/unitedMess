/**
 * resync_flat_bill_status.js
 *
 * Re-syncs the STORED flat bill fields (`user.payment`, `user.gasBill`)
 * against ground truth: Payment records for the CURRENT billing period.
 *
 * Why: the stored flat fields are what `searchUsers` and the edit-member
 * modal read, so a stale value (e.g. Md Rafij's gasBill='refunded' while the
 * September gas bill was actually PAID with a completed ₹150 record) keeps
 * rendering wrong statuses on those surfaces even after the API cascades
 * were fixed.
 *
 * Ground truth (current billing period only):
 *   mess refund Payment  exists → payment  = 'refunded'  (settled)
 *   mess completed       exists → payment  = 'success'
 *   gas refund Payment   exists → gasBill  = 'refunded'  (settled)
 *   gas completed        exists → gasBill  = 'success'
 *   no records           → leave untouched (invoice status / admin manual
 *                          toggles still drive the dynamic UI cascades;
 *                          'refund' cannot be represented in the flat enum)
 *
 * Run:
 *   node scripts/resync_flat_bill_status.js          # REPORT ONLY
 *   node scripts/resync_flat_bill_status.js --apply  # WRITE changes
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Payment = require('../src/models/Payment.model');
const User = require('../src/models/User.model');
const { getBillingPeriod } = require('../src/utils/helpers/date.helper');

const APPLY = process.argv.includes('--apply');

const decide = ({ stored, refund, completed }) => {
    if (refund) return 'refunded';
    if (completed) return 'success';
    return stored; // no evidence either way → keep (never guess)
};

(async () => {
    await mongoose.connect(process.env.MONGO_URL);
    const { monthName, month, year } = getBillingPeriod();
    console.log(`Connected to DB — billing period: ${monthName}\n${APPLY ? 'MODE: APPLY (writes enabled)' : 'MODE: report only (pass --apply to write)'}\n`);

    const users = await User.find({}).select('name email payment gasBill isActive').lean();
    const rows = [];
    let checked = 0;

    for (const u of users) {
        const payments = await Payment.find({
            user: u._id,
            month: monthName,
            type: { $in: ['mess_bill', 'gas_bill'] },
            status: { $in: ['completed', 'refunded'] },
        }).select('type status amount').lean();
        checked += 1;

        const has = (type, status) => payments.some(p => p.type === type && p.status === status);

        const expectedPayment = decide({
            stored: u.payment,
            refund: has('mess_bill', 'refunded'),
            completed: has('mess_bill', 'completed'),
        });
        const expectedGas = decide({
            stored: u.gasBill,
            refund: has('gas_bill', 'refunded'),
            completed: has('gas_bill', 'completed'),
        });

        for (const [field, expected] of [['payment', expectedPayment], ['gasBill', expectedGas]]) {
            const stored = u[field];
            if (stored === expected) continue;
            rows.push({
                userId: String(u._id),
                name: u.name || u.email,
                field,
                stored,
                expected,
                evidence: payments
                    .filter(p => (field === 'payment' ? p.type === 'mess_bill' : p.type === 'gas_bill'))
                    .map(p => `${p.type}:${p.status}:₹${p.amount}`)
                    .join(', ') || '(no payment records)',
            });
        }
    }

    if (rows.length === 0) {
        console.log(`Checked ${checked} users — all stored flat fields match payment records. Nothing to do.`);
        await mongoose.disconnect();
        return;
    }

    console.log(`Checked ${checked} users — ${rows.length} stale field(s) found:\n`);
    console.table(rows.map(r => ({ member: r.name, field: r.field, stored: r.stored, expected: r.expected, evidence: r.evidence })));

    if (!APPLY) {
        console.log('\nReport only — no writes performed. Re-run with --apply to fix the fields above.');
        await mongoose.disconnect();
        return;
    }

    let written = 0;
    for (const r of rows) {
        await User.updateOne({ _id: r.userId }, { $set: { [r.field]: r.expected } });
        console.log(`[FIXED] ${r.name} · ${r.field}: ${r.stored} → ${r.expected}`);
        written += 1;
    }

    console.log(`\n=== Apply Complete ===\nFields updated: ${written}`);
    await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
