const mongoose = require('mongoose');

const delivery = new mongoose.Schema({
    recipientId: { type: String, required: true },
    memberId: String,
    name: String,
    email: String,
    combined: Boolean,
    status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
}, { _id: false });
const schema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, required: true },
    key: { type: String, required: true },
    fingerprint: { type: String, required: true },
    type: { type: String, enum: ['market', 'meal', 'both'], required: true },
    memberId: String,
    asOf: { type: Date, required: true },
    state: { type: String, enum: ['queued', 'running', 'complete', 'interrupted'], default: 'queued' },
    deliveries: [delivery],
    expiresAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ owner: 1, key: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('AnalyticsReportJob', schema);
