/**
 * Migration script: Fix Meal.mealCount for guest meals created via createMeal.
 *
 * Bug: createMeal set Meal.mealCount = mealTypeCountMap[type] (excludes guests),
 * but bulkCreateMeals and updateMealById set Meal.mealCount = typeCount + guestCount.
 * This caused inconsistent bill calculations depending on creation path.
 *
 * This script:
 *  1. Finds all meals where isGuestMeal = true and mealCount doesn't include guests.
 *  2. Updates mealCount = mealTypeCountMap[type] + guestCount for each.
 *  3. Recalculates affected users' totalMeal from fresh SUM(Meal.mealCount).
 *  4. Triggers recalculateAllActiveUsersPayable() for invoice refresh.
 *
 * Usage: node scripts/fix_guest_meal_count.js
 * Safe to re-run (idempotent).
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Meal = require('../src/models/Meal.model');
const User = require('../src/models/User.model');
const connectDB = require('../src/database/connection');

const mealTypeCountMap = {
    off: 0,
    both: 2,
    day: 1,
    night: 1,
};

async function run() {
    try {
        console.log('Connecting to DB...');
        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }
        console.log('Connected.\n');

        // ── Step 1: Find guest meals with incorrect mealCount ──
        console.log('=== Step 1: Find guest meals with incorrect mealCount ===');

        const allGuestMeals = await Meal.find({ isGuestMeal: true })
            .select('user date type mealCount guestCount isGuestMeal')
            .lean();

        console.log(`Found ${allGuestMeals.length} total guest meal(s).`);

        const mealsToFix = allGuestMeals.filter(meal => {
            const typeCount = mealTypeCountMap[meal.type] ?? 0;
            const correctMealCount = typeCount + (meal.guestCount || 0);
            return meal.mealCount !== correctMealCount;
        });

        console.log(`${mealsToFix.length} meal(s) need mealCount correction.\n`);

        // ── Step 2: Fix each meal ──
        console.log('=== Step 2: Fix mealCount for affected meals ===');

        const affectedUserIds = new Set();
        let fixedCount = 0;

        for (const meal of mealsToFix) {
            const typeCount = mealTypeCountMap[meal.type] ?? 0;
            const correctMealCount = typeCount + (meal.guestCount || 0);

            await Meal.updateOne(
                { _id: meal._id },
                { $set: { mealCount: correctMealCount } }
            );

            affectedUserIds.add(meal.user.toString());
            fixedCount++;
            console.log(
                `  [${fixedCount}] Meal ${meal._id} (${meal.date.toISOString().slice(0, 10)}): `
                + `mealCount ${meal.mealCount} → ${correctMealCount} `
                + `(type=${meal.type}, guests=${meal.guestCount})`
            );
        }

        console.log(`\nStep 2 done. ${fixedCount} meal(s) fixed.\n`);

        // ── Step 3: Recalculate totalMeal for affected users ──
        console.log('=== Step 3: Recalculate totalMeal for affected users ===');

        let recalculated = 0;
        for (const userId of affectedUserIds) {
            const [agg] = await Meal.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(userId) } },
                { $group: { _id: null, totalMeal: { $sum: '$mealCount' }, guestMeal: { $sum: '$guestCount' } } }
            ]);

            const newTotalMeal = agg?.totalMeal || 0;
            const newGuestMeal = agg?.guestMeal || 0;

            await User.updateOne(
                { _id: userId },
                { $set: { totalMeal: newTotalMeal, guestMeal: newGuestMeal } }
            );

            recalculated++;
            console.log(`  User ${userId}: totalMeal → ${newTotalMeal}, guestMeal → ${newGuestMeal}`);
        }

        console.log(`\nStep 3 done. ${recalculated} user(s) recalculated.\n`);

        // ── Step 4: Trigger payable recalculation for all active users ──
        console.log('=== Step 4: Trigger payable recalculation ===');

        if (fixedCount > 0) {
            // Dynamically require to avoid circular dependencies at top level
            const { recalculateAllActiveUsersPayable } = require('../src/services/user.service');
            await recalculateAllActiveUsersPayable();
            console.log('All active users payable amounts recalculated.');
        } else {
            console.log('No meals were fixed — skipping payable recalculation.');
        }

        console.log('\nMigration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
