const mongoose = require('mongoose');

const upiConfigSchema = new mongoose.Schema(
    {
        upiId: {
            type: String,
            required: [true, 'UPI ID is required'],
            trim: true,
            validate: {
                validator: function (v) {
                    // Standard UPI ID format: username@bank
                    return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(v);
                },
                message: 'Please provide a valid UPI ID (e.g. name@bank)'
            }
        },
        qrCodeUrl: {
            type: String,
            required: false,
        },
        merchantName: {
            type: String,
            required: false,
            default: 'United Mess',
            trim: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

const UpiConfig = mongoose.model('UpiConfig', upiConfigSchema);
module.exports = UpiConfig;
