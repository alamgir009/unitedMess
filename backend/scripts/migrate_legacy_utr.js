/**
 * Migration script: migrate legacy approved manual-UPI payments.
 *
 * Before this fix, `transactionId` stored the raw user-submitted UTR.
 * Now we have a separate `utr` field for the raw UTR and `transactionId`
 * gets a system-generated `UM*` reference at approval time.
 *
 * This script:
 *  1. Finds all completed manual-UPI payments where `utr` is null/undefined.
 *  2. Sets `utr = transactionId` (preserving the original raw UTR).
 *  3. Generates a unique `UM*` system reference for `transactionId`.
 *
 * Usage: node scripts/migrate_legacy_utr.js
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Payment = require('../src/models/Payment.model');
const connectDB = require('../src/database/connection');

async function run() {
    try {
        console.log('Connecting to DB...');
        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }
        console.log('Connected.');

        const legacyPayments = await Payment.find({
            paymentMethod: 'upi_manual',
            status: 'completed',
            utr: { $in: [null, undefined] },
        }).lean();

        console.log(`Found ${legacyPayments.length} legacy payment(s) to migrate.`);

        let migrated = 0;
        for (const p of legacyPayments) {
            const sysRef = `UM${Date.now().toString(36).toUpperCase()}-${p._id.toString().slice(-6).toUpperCase()}`;
            await Payment.updateOne(
                { _id: p._id },
                { $set: { utr: p.transactionId, transactionId: sysRef } }
            );
            migrated++;
            console.log(`  [${migrated}] ${p._id}: utr ← "${p.transactionId}", transactionId ← "${sysRef}"`);
        }

        console.log(`\nDone. ${migrated} payment(s) migrated.`);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
