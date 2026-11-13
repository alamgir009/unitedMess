/**
 * Migration script: backfill overdue-penalty fields on existing invoices.
 *
 * Idempotent — safe to re-run.
 *
 *  1. Ensures the PenaltyConfig singleton exists (default ₹100/day).
 *  2. Sets `dueDate` on invoices that are missing it (ALL statuses — dueDate
 *     is a pure function of the billing month, so even historical paid bills
 *     get the date stamped, but their AMOUNTS are never touched: no penalty
 *     is ever computed or written for already-paid invoices).
 *  3. Snapshots the current global rate onto UNPAID/PARTIALLY-PAID,
 *     non-exempt bills that are already past due — exactly what the lazy
 *     read-path snapshot would do, just done up front.
 *
 * Historical paid bills are NEVER modified beyond the dueDate stamp; no
 * penalty accrues on them (computePenalty receives their paidAt on reads and
 * their net penalty is informational only — no payment flow change).
 *
 * Usage: node scripts/backfill_penalty_due_dates.js
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Invoice = require('../src/models/Invoice.model');
const PenaltyConfig = require('../src/models/PenaltyConfig.model');
const penaltyService = require('../src/services/penalty.service');
const connectDB = require('../src/database/connection');

async function run() {
    try {
        console.log('Connecting to DB...');
        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }
        console.log('Connected.\n');

        // ── Step 1: PenaltyConfig singleton ──────────────────────────────
        console.log('=== Step 1: Ensure PenaltyConfig singleton exists ===');
        const rate = await penaltyService.getGlobalDailyRate();
        console.log(`Global daily penalty rate: ₹${rate}\n`);

        // ── Step 2: Backfill dueDate (pure function of month/year) ───────
        console.log('=== Step 2: Backfill missing dueDate ===');
        const missingDue = await Invoice.find(
            { $or: [{ dueDate: { $exists: false } }, { dueDate: null }] },
            { month: 1, year: 1 }
        ).lean();
        console.log(`Found ${missingDue.length} invoice(s) without dueDate.`);

        if (missingDue.length > 0) {
            const ops = missingDue.map((inv) => ({
                updateOne: {
                    filter: { _id: inv._id },
                    update: { $set: { dueDate: penaltyService.getDueDate(inv.month, inv.year) } },
                },
            }));
            const res = await Invoice.bulkWrite(ops, { ordered: false });
            console.log(`dueDate stamped on ${res.modifiedCount} invoice(s).\n`);
        }

        // ── Step 3: Snapshot rate onto overdue, open, non-exempt debt ────
        console.log('=== Step 3: Snapshot rate onto already-overdue open bills ===');
        const overdueOpen = await Invoice.find({
            status: { $in: ['unpaid', 'partially_paid'] },
            isExempt: { $ne: true },
            totalPayable: { $gt: 0 },
            penaltyRateSnapshot: null,
            dueDate: { $lt: new Date() },
        }).lean();
        console.log(`Found ${overdueOpen.length} overdue open bill(s) without a rate snapshot.`);

        if (overdueOpen.length > 0) {
            const ops = overdueOpen.map((inv) => ({
                updateOne: {
                    // Conditional on the missing snapshot → idempotent even
                    // if the lazy read-path snapshot raced this script.
                    filter: { _id: inv._id, penaltyRateSnapshot: null },
                    update: {
                        $set: { penaltyRateSnapshot: rate },
                        $push: {
                            penaltyAuditLog: {
                                action: 'snapshot',
                                actor: null,
                                oldValue: null,
                                newValue: rate,
                                reason: 'Backfill migration — bill was already overdue at feature rollout',
                                at: new Date(),
                            },
                        },
                    },
                },
            }));
            const res = await Invoice.bulkWrite(ops, { ordered: false });
            console.log(`Snapshot written on ${res.modifiedCount} bill(s).\n`);
        }

        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close().catch(() => {});
    }
}

run();
