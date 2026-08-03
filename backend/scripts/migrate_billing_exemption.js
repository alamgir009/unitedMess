/**
 * Migration script: Backfill billing exemption data for existing users.
 *
 * After the billing exemption feature was deployed, existing users may have
 * null `activatedAt`, `billingExemptMonth`, and `billingExemptYear` fields.
 * This causes the runtime exemption check in getInvoice() to fail, resulting
 * in users being charged for months they were inactive.
 *
 * This script:
 *  1. Backfills `activatedAt` from `createdAt` for all approved users where it's null.
 *  2. Fixes known exempt users (e.g., mdnayanislam3@gmail.com) by setting
 *     billingExemptMonth/Year and zeroing out their July 2026 invoice.
 *
 * Usage: node scripts/migrate_billing_exemption.js
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User.model');
const Invoice = require('../src/models/Invoice.model');
const connectDB = require('../src/database/connection');

async function run() {
    try {
        console.log('Connecting to DB...');
        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }
        console.log('Connected.\n');

        // ── Step 1: Backfill activatedAt from createdAt for all approved users ──
        console.log('=== Step 1: Backfill activatedAt from createdAt ===');

        const usersNeedingActivatedAt = await User.find({
            userStatus: 'approved',
            isActive: true,
            $or: [
                { activatedAt: { $exists: false } },
                { activatedAt: null },
            ],
        }).lean();

        console.log(`Found ${usersNeedingActivatedAt.length} user(s) with null activatedAt.`);

        let backfilled = 0;
        for (const u of usersNeedingActivatedAt) {
            const sourceDate = u.createdAt || new Date();
            await User.updateOne(
                { _id: u._id },
                { $set: { activatedAt: sourceDate } }
            );
            backfilled++;
            console.log(`  [${backfilled}] ${u.email}: activatedAt ← ${sourceDate.toISOString()}`);
        }

        console.log(`Step 1 done. ${backfilled} user(s) backfilled.\n`);

        // ── Step 2: Fix known exempt users ──
        console.log('=== Step 2: Fix known exempt users ===');

        const exemptEmails = [
            {
                email: 'mdnayanislam3@gmail.com',
                activatedAt: new Date('2026-08-03T00:00:00Z'),
                billingExemptMonth: 7,
                billingExemptYear: 2026,
                exemptMonth: 7,
                exemptYear: 2026,
                reason: 'Member was inactive during July 2026 — activated after billing period started',
            },
        ];

        for (const exempt of exemptEmails) {
            const user = await User.findOne({ email: exempt.email });
            if (!user) {
                console.log(`  SKIP: ${exempt.email} not found.`);
                continue;
            }

            // Set billing exemption fields on user
            await User.updateOne(
                { _id: user._id },
                {
                    $set: {
                        activatedAt: exempt.activatedAt,
                        billingExemptMonth: exempt.billingExemptMonth,
                        billingExemptYear: exempt.billingExemptYear,
                        paybleAmountforMeal: 0,
                    },
                }
            );
            console.log(`  User ${exempt.email}: activatedAt, billingExemptMonth/Year set.`);

            // Find existing invoice for the exempt period
            const invoice = await Invoice.findOne({
                user: user._id,
                month: exempt.exemptMonth,
                year: exempt.exemptYear,
            });

            if (invoice) {
                await Invoice.updateOne(
                    { _id: invoice._id },
                    {
                        $set: {
                            totalBill: 0,
                            totalPayable: 0,
                            paidAmount: 0,
                            messCost: 0,
                            mealCount: 0,
                            guestMealCount: 0,
                            guestMealRevenue: 0,
                            marketAmountSpent: 0,
                            mealRate: 0,
                            fixedCosts: {
                                cookingCharge: 0,
                                waterBill: 0,
                                gasBillCharge: 0,
                                platformFee: 0,
                            },
                            isExempt: true,
                            exemptReason: exempt.reason,
                            status: 'paid',
                        },
                    }
                );
                console.log(`  Invoice ${invoice._id} (${exempt.exemptMonth}/${exempt.exemptYear}): zeroed out, marked exempt.`);
            } else {
                const monthName = new Intl.DateTimeFormat('en-US', {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC',
                }).format(new Date(Date.UTC(exempt.exemptYear, exempt.exemptMonth - 1, 1)));

                await Invoice.create({
                    user: user._id,
                    month: exempt.exemptMonth,
                    year: exempt.exemptYear,
                    monthName,
                    mealCount: 0,
                    guestMealCount: 0,
                    marketAmountSpent: 0,
                    mealRate: 0,
                    messCost: 0,
                    guestMealRevenue: 0,
                    fixedCosts: { cookingCharge: 0, waterBill: 0, gasBillCharge: 0, platformFee: 0 },
                    totalBill: 0,
                    totalPayable: 0,
                    paidAmount: 0,
                    isExempt: true,
                    exemptReason: exempt.reason,
                    status: 'paid',
                    isFinalized: false,
                });
                console.log(`  Invoice created (${exempt.exemptMonth}/${exempt.exemptYear}): exempt, zero-amount.`);
            }
        }

        console.log(`\nStep 2 done. ${exemptEmails.length} known exempt user(s) processed.\n`);
        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
