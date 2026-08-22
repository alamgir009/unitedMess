/**
 * Migration script: migrate MarketSchedule schema changes.
 *
 * Changes being migrated:
 *  1. Drop old unique index {date: 1, user: 1} → replace with {date: 1}
 *  2. Backfill `monthKey` field (e.g., "2026-08") from existing month/year fields
 *  3. Backfill `status: "active"` on all existing documents (defaults only applied on new inserts)
 *  4. Backfill `source: "user"` on all existing documents
 *  5. Resolve cross-user date conflicts: keep earliest-created, supersede the rest
 *  6. Create new compound indexes
 *
 * Usage: node scripts/migrate_market_schedule_indexes.js [--dry-run]
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const MarketSchedule = require('../src/models/MarketSchedule.model');
const connectDB = require('../src/database/connection');

const DRY_RUN = process.argv.includes('--dry-run');

function toMonthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

async function run() {
    try {
        console.log(`Connecting to DB...${DRY_RUN ? ' (DRY RUN)' : ''}`);
        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }
        console.log('Connected.');

        const db = mongoose.connection.db;
        const collection = db.collection('marketschedules');

        // ── Step 1: Drop old unique index {date, user} ──
        console.log('\n=== Step 1: Drop old unique index ===');
        const indexes = await collection.indexes();
        const oldIndex = indexes.find(
            (idx) => idx.key.date === 1 && idx.key.user === 1 && idx.unique
        );
        if (oldIndex) {
            console.log(`Found old unique index: ${oldIndex.name}`);
            if (!DRY_RUN) {
                await collection.dropIndex(oldIndex.name);
                console.log(`  Dropped index ${oldIndex.name}`);
            } else {
                console.log(`  [DRY RUN] Would drop index ${oldIndex.name}`);
            }
        } else {
            console.log('Old unique index not found (may have already been removed).');
        }

        // ── Step 2: Backfill monthKey, status, source on all docs ──
        console.log('\n=== Step 2: Backfill monthKey, status, source ===');
        const docs = await collection.find({}).toArray();
        console.log(`Found ${docs.length} existing document(s).`);

        let backfilled = 0;
        for (const doc of docs) {
            const update = {};
            let needsUpdate = false;

            // Backfill monthKey
            if (!doc.monthKey && doc.month != null && doc.year != null) {
                update.monthKey = toMonthKey(doc.year, doc.month);
                needsUpdate = true;
            }

            // Backfill status
            if (!doc.status) {
                update.status = 'active';
                needsUpdate = true;
            }

            // Backfill source
            if (!doc.source) {
                update.source = 'user';
                needsUpdate = true;
            }

            // Backfill googleSyncStatus
            if (doc.googleSyncStatus === undefined) {
                update.googleSyncStatus = null;
                needsUpdate = true;
            }

            if (needsUpdate) {
                if (!DRY_RUN) {
                    await collection.updateOne({ _id: doc._id }, { $set: update });
                }
                backfilled++;
                console.log(
                    `  ${DRY_RUN ? '[DRY RUN] ' : ''}Updated ${doc._id}: ${JSON.stringify(update)}`
                );
            }
        }
        console.log(`Backfilled ${backfilled} document(s).`);

        // ── Step 3: Resolve cross-user date conflicts ──
        console.log('\n=== Step 3: Resolve cross-user date conflicts ===');
        const activeDocs = await collection
            .find({ status: 'active' })
            .sort({ date: 1, createdAt: 1 })
            .toArray();

        // Group by date (normalized to midnight UTC)
        const dateGroups = {};
        for (const doc of activeDocs) {
            const dateKey = doc.date.toISOString().split('T')[0];
            if (!dateGroups[dateKey]) {
                dateGroups[dateKey] = [];
            }
            dateGroups[dateKey].push(doc);
        }

        let superseded = 0;
        for (const [dateKey, group] of Object.entries(dateGroups)) {
            if (group.length > 1) {
                console.log(
                    `  Date ${dateKey}: ${group.length} active docs — keeping earliest, superseding rest`
                );
                // First in sort order (earliest createdAt) is kept
                const [, ...rest] = group;
                for (const doc of rest) {
                    if (!DRY_RUN) {
                        await collection.updateOne(
                            { _id: doc._id },
                            { $set: { status: 'superseded' } }
                        );
                    }
                    superseded++;
                    console.log(
                        `    ${DRY_RUN ? '[DRY RUN] ' : ''}Superseded ${doc._id} (user: ${doc.user})`
                    );
                }
            }
        }
        console.log(`Superseded ${superseded} conflicting document(s).`);

        // ── Step 4: Ensure indexes exist ──
        console.log('\n=== Step 4: Ensure indexes ===');
        if (!DRY_RUN) {
            await collection.createIndex({ date: 1 }, { unique: true });
            console.log('  Ensured unique index on {date}');
            await collection.createIndex({ monthKey: 1, date: 1 });
            console.log('  Ensured compound index on {monthKey, date}');
            await collection.createIndex({ user: 1, monthKey: 1 });
            console.log('  Ensured compound index on {user, monthKey}');
            // Partial index on {status, monthKey} for active docs
            await collection.createIndex(
                { status: 1, monthKey: 1 },
                { partialFilterExpression: { status: 'active' } }
            );
            console.log('  Ensured partial index on {status, monthKey} where status=active');
        } else {
            console.log('  [DRY RUN] Would create/ensure all 4 indexes');
        }

        // ── Step 5: Verify ──
        console.log('\n=== Step 5: Verify ===');
        const finalIndexes = await collection.indexes();
        console.log('Final indexes:');
        for (const idx of finalIndexes) {
            console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (unique)' : ''}`);
        }

        const remainingConflicts = await collection.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$date', count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
        ]).toArray();
        if (remainingConflicts.length === 0) {
            console.log('\nNo remaining cross-user date conflicts. Migration successful!');
        } else {
            console.error(`\nWARNING: ${remainingConflicts.length} date(s) still have conflicts!`);
            for (const c of remainingConflicts) {
                console.error(`  ${c._id}: ${c.count} active docs`);
            }
        }

        console.log(`\nMigration ${DRY_RUN ? 'preview' : 'completed'} successfully.`);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
