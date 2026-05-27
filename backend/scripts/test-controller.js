const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User.model');
const paymentController = require('../src/api/v1/controllers/payment.controller');

async function run() {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/mess');
    console.log('Connected.');

    try {
        const testUser = await User.findOne();
        if (!testUser) {
            console.log('No user found in DB.');
            return;
        }

        const req = {
            user: {
                id: testUser._id.toString()
            }
        };

        console.log('Calling paymentController.getPayableMonths...');
        await new Promise((resolve) => {
            const res = {
                statusCode: 200,
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(data) {
                    console.log('Success response received:', JSON.stringify(data, null, 2));
                    resolve();
                }
            };
            const next = (err) => {
                console.error('ERROR PASSED TO NEXT:', err);
                resolve();
            };
            paymentController.getPayableMonths(req, res, next);
        });
        console.log('Done calling.');
    } catch (err) {
        console.error('Controller call failed with error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

run();
