const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User.model');
const Meal = require('../src/models/Meal.model');
const Market = require('../src/models/Market.model');
const mealService = require('../src/services/meal.service');
const marketService = require('../src/services/market.service');
const connectDB = require('../src/database/connection');

async function run() {
    try {
        console.log('Connecting to DB...');
        await connectDB();

        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }
        console.log('Connected.');

        // Cleanup
        const testEmail = 'test_optim_create@example.com';
        await User.findOneAndDelete({ email: testEmail });
        // Clean related if needed, but assuming fresh user helps isolation

        // Create User
        console.log('Creating user...');
        const user = await User.create({
            name: 'Test Optim User',
            email: testEmail,
            password: 'password123',
            role: 'user',
            userStatus: 'approved'
        });

        // Test Meal Creation
        console.log('Testing Meal Creation...');
        const mealData = {
            user: user._id,
            date: new Date(),
            type: 'both',
            isGuestMeal: false
        };
        const newMeal = await mealService.createMeal(mealData);
        console.log('New Meal Created:', newMeal._id);

        // Verify User has Meal ID
        const userAfterMeal = await User.findById(user._id);
        console.log('User Meals Array:', userAfterMeal.meals);

        if (userAfterMeal.meals.some(id => id.toString() === newMeal._id.toString())) {
            console.log('SUCCESS: Meal ID pushed to User.');
        } else {
            console.error('FAILURE: Meal ID NOT found in User.');
            process.exit(1);
        }

        // Test Market Creation
        console.log('Testing Market Creation...');
        const marketData = {
            user: user._id,
            date: new Date(),
            amount: 500,
            items: 'Test Items'
        };
        const newMarket = await marketService.createMarket(marketData);
        console.log('New Market Created:', newMarket._id);

        // Verify User has Market ID
        const userAfterMarket = await User.findById(user._id);
        console.log('User Markets Array:', userAfterMarket.markets);

        if (userAfterMarket.markets.some(id => id.toString() === newMarket._id.toString())) {
            console.log('SUCCESS: Market ID pushed to User.');
        } else {
            console.error('FAILURE: Market ID NOT found in User.');
            process.exit(1);
        }

        // Cleanup
        await User.findOneAndDelete({ email: testEmail });
        await Meal.findByIdAndDelete(newMeal._id);
        await Market.findByIdAndDelete(newMarket._id);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
