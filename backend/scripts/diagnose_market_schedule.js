/**
 * Diagnostic script: Check market schedule data for a given month.
 *
 * Usage:
 *   node scripts/diagnose_market_schedule.js                    # current month
 *   node scripts/diagnose_market_schedule.js 2026 9             # Sep 2026
 *   node scripts/diagnose_market_schedule.js 2026 9 --restore   # restore reset records
 */

'use strict';

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const MarketSchedule = require('../src/models/MarketSchedule.model');
require('../src/models/User.model');
const connectDB = require('../src/database/connection');

const year = parseInt(process.argv[2], 10) || new Date().getFullYear();
const month = parseInt(process.argv[3], 10) || new Date().getUTCMonth() + 1;
const shouldRestore = process.argv.includes('--restore');

function toMonthKey(y, m) {
    return `${y}-${String(m).padStart(2, '0')}`;
}

async function run() {
    try {
        console.log(`Connecting to DB...`);
        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            await new Promise((resolve) => mongoose.connection.once('open', resolve));
        }
        console.log('Connected.\n');

        const db = mongoose.connection.db;
        const collection = db.collection('marketschedules');
        const monthKey = toMonthKey(year, month);

        console.log(`=== Market Schedule Diagnostic: ${monthKey} ===\n`);

        // 1. Total records
        const all = await collection.find({ monthKey }).toArray();
        console.log(`Total records (all statuses): ${all.length}`);

        // 2. By status
        const byStatus = {};
        for (const doc of all) {
            const s = doc.status || 'none';
            byStatus[s] = (byStatus[s] || 0) + 1;
        }
        console.log('By status:', byStatus);

        // 3. Active records (what the API returns)
        const active = await MarketSchedule
            .find({ monthKey, status: 'active' })
            .sort({ date: 1 })
            .populate('user', 'name email')
            .lean();
        console.log(`\nActive records (API visible): ${active.length}`);
        if (active.length > 0) {
            for (const doc of active) {
                const userName = doc.user?.name || doc.user?.toString() || 'unknown';
                console.log(`  ${doc.date.toISOString().split('T')[0]} - ${userName} (source: ${doc.source || 'user'})`);
            }
        }

        // 4. Reset records (cron-destroyed)
        const reset = await collection.find({ monthKey, status: 'reset' }).toArray();
        console.log(`\nReset records (cron-destroyed): ${reset.length}`);
        if (reset.length > 0) {
            for (const doc of reset.slice(0, 10)) {
                console.log(`  ${doc.date.toISOString().split('T')[0]} - user: ${doc.user} - created: ${doc.createdAt?.toISOString() || 'N/A'}`);
            }
            if (reset.length > 10) {
                console.log(`  ... and ${reset.length - 10} more`);
            }
        }

        // 5. Superseded records
        const superseded = await collection.find({ monthKey, status: 'superseded' }).toArray();
        console.log(`\nSuperseded records: ${superseded.length}`);

        // 6. Simulate API query
        console.log('\n=== Simulating getMonthSchedule API query ===');
        const apiResult = await MarketSchedule
            .find({ monthKey, status: 'active' })
            .sort({ date: 1 })
            .lean();
        console.log(`API would return: ${apiResult.length} record(s)`);

        // 7. Restore if --restore flag
        if (shouldRestore && reset.length > 0) {
            console.log(`\n=== Restoring ${reset.length} reset record(s) ===`);
            const result = await collection.updateMany(
                { monthKey, status: 'reset' },
                { $set: { status: 'active' } }
            );
            console.log(`Restored ${result.modifiedCount} record(s)`);
        } else if (shouldRestore) {
            console.log('\nNo reset records to restore.');
        }

        // 8. Indexes
        const indexes = await collection.indexes();
        console.log('\n=== Collection Indexes ===');
        for (const idx of indexes) {
            const partial = idx.partialFilterExpression
                ? ` (partial: ${JSON.stringify(idx.partialFilterExpression)})`
                : '';
            console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (unique)' : ''}${partial}`);
        }

        console.log(`\nDiagnostic complete for ${monthKey}.`);
    } catch (err) {
        console.error('Diagnostic failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
