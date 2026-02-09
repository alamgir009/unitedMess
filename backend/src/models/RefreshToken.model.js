const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        index: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['refresh', 'reset_password', 'verify_email'],
        required: true,
    },
    expires: {
        type: Date,
        required: true,
    },
    blacklisted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
