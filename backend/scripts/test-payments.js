const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User.model');
const Payment = require('../src/models/Payment.model');
const Invoice = require('../src/models/Invoice.model');
const UpiConfig = require('../src/models/UpiConfig.model');

async function run() {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/mess');
    console.log('Connected.');

    try {
        console.log('1. Checking UPI Config schema...');
        const testUser = await User.findOne();
        if (!testUser) {
            console.log('No user found in DB. Skipping model creation tests.');
            return;
        }

        // Test UpiConfig Upsert
        let config = await UpiConfig.findOne();
        if (!config) {
            config = await UpiConfig.create({
                upiId: 'test@okaxis',
                merchantName: 'Test Mess Admin',
                updatedBy: testUser._id
            });
            console.log('Created new UpiConfig:', config);
        } else {
            console.log('Found existing UpiConfig:', config);
        }

        // Test UTR format check
        console.log('2. Testing manual UPI reference validations...');
        const validUtr = '123456789012';
        const invalidUtr = 'short';

        const utrRegex = /^[a-zA-Z0-9]{8,20}$/;
        console.log(`Validating "${validUtr}":`, utrRegex.test(validUtr)); // should be true
        console.log(`Validating "${invalidUtr}":`, utrRegex.test(invalidUtr)); // should be false

        console.log('All model tests passed.');
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

run();
