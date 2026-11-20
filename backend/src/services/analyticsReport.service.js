const { createHash } = require('crypto');
const validator = require('validator');
const analytics = require('./analytics.service');
const User = require('../models/User.model');
const Job = require('../models/AnalyticsReportJob.model');
const AppError = require('../utils/errors/AppError');
const config = require('../config');
const active = analytics.activeMember;

async function loadReport(type, memberId, now = new Date()) {
    const [market, meal, people] = await Promise.all([
        analytics.getReport('market', memberId, now),
        analytics.getReport('meal', memberId, now),
        User.find({ ...active, ...(memberId && { _id: memberId }) }).select('_id name').sort({ name: 1, _id: 1 }).lean(),
    ]);
    if (memberId && !people.length) throw new AppError('Select an active, approved member.', 404);
    return { type, memberId, name: memberId ? people[0].name : 'All Members', market, meal, people, generatedAt: new Date().toISOString() };
}

async function recipientsFor(input, admin) {
    const people = await User.find({ ...active, ...(input.memberId && { _id: input.memberId }) }).select('_id name email role').sort({ name: 1, _id: 1 }).lean();
    if (input.memberId && !people.length) throw new AppError('Select an active, approved member.', 404);
    const administrators = await User.find({ ...active, role: 'admin' }).select('_id name email').sort({ name: 1, _id: 1 }).lean();
    const admins = administrators.filter((person) => person.email && validator.isEmail(person.email));
    const defaultAdmin = admins.find((person) => String(person._id) === String(admin._id)) || admins[0];
    const requested = input.recipients === undefined ? (input.memberId || !defaultAdmin ? [] : [defaultAdmin.email]) : input.recipients;
    const selected = [...new Set(requested.map((email) => String(email).toLowerCase()))];
    const copies = selected.map((email) => {
        const person = admins.find((entry) => entry.email?.toLowerCase() === email);
        if (!person) throw new AppError('Report copies can only be sent to active, approved administrators.', 400);
        return { recipientId: `admin:${person._id}`, memberId: input.memberId, name: person.name, email: person.email, combined: !input.memberId, status: 'pending' };
    });
    const deliveries = people.map((person) => ({
        recipientId: `member:${person._id}`, memberId: String(person._id), name: person.name,
        email: person.email, combined: false,
        status: person.email && validator.isEmail(person.email) ? 'pending' : 'skipped',
    }));
    return { deliveries: [...deliveries, ...copies.filter((copy) => !input.memberId || !deliveries.some((entry) => entry.email === copy.email))], admins };
}

function publicJob(job) {
    return { jobId: String(job._id), state: job.state, recipients: job.deliveries.map(({ recipientId, name, status }) => ({ recipientId, name, status })) };
}

async function getJob(id, admin) {
    let job = await Job.findOne({ _id: id, owner: admin._id }).lean();
    if (!job) throw new AppError('Report job not found.', 404);
    if (job.state === 'running' && new Date(job.updatedAt).getTime() < Date.now() - 30 * 60000) {
        await Job.updateOne({ _id: id, owner: admin._id, state: 'running', updatedAt: job.updatedAt }, { $set: { state: 'interrupted' } });
        job = await Job.findOne({ _id: id, owner: admin._id }).lean();
    }
    if (job.state === 'queued') schedule(job._id);
    return job;
}

const pendingJobs = new Set();
let draining = false;
function schedule(id) {
    pendingJobs.add(String(id));
    if (!draining) {
        draining = true;
        setImmediate(async () => {
            try {
                for (const jobId of pendingJobs) {
                    pendingJobs.delete(jobId);
                    await deliverJob(jobId);
                }
            } finally { draining = false; }
        });
    }
}

async function deliverJob(id) {
    let job;
    try {
        job = await Job.findOneAndUpdate({ _id: id, state: 'queued' }, { $set: { state: 'running' } }, { new: true }).lean();
        if (!job) return;
        const { generateAnalyticsPDF } = require('./analyticsReportPdf.service');
        const { sendAnalyticsReportEmail } = require('./email.service');
        const pending = job.deliveries.filter((entry) => entry.status === 'pending');
        for (let index = 0; index < pending.length; index += 5) {
            const results = await Promise.allSettled(pending.slice(index, index + 5).map(async (entry) => {
                let status = 'failed';
                try {
                    const person = await User.findOne({ _id: entry.recipientId.split(':')[1], ...active, ...(entry.recipientId.startsWith('admin:') && { role: 'admin' }) }).select('email name').lean();
                    if (!person || !person.email || person.email !== entry.email || !validator.isEmail(person.email)) status = 'skipped';
                    else {
                        const report = await loadReport(job.type, entry.combined ? undefined : entry.memberId, job.asOf);
                        const pdf = await generateAnalyticsPDF(report);
                        await sendAnalyticsReportEmail(entry.email, report, pdf);
                        status = 'sent';
                    }
                } catch (_) { /* Only recipient status is exposed. SMTP retries are owned by the mailer. */ }
                await Job.updateOne({ _id: id, 'deliveries.recipientId': entry.recipientId }, { $set: { 'deliveries.$.status': status } });
            }));
            if (results.some((result) => result.status === 'rejected')) {
                await Job.updateOne({ _id: id }, { $set: { state: 'interrupted' } });
                return;
            }
        }
        await Job.updateOne({ _id: id }, { $set: { state: 'complete' } });
    } catch (_) {
        // Never replay an uncertain SMTP delivery automatically.
        if (job) await Job.updateOne({ _id: id }, { $set: { state: 'interrupted' } }).catch(() => {});
    }
}

async function startJob(input, admin, key) {
    await Job.init();
    const canonical = { type: input.type, memberId: input.memberId || null, months: 3, recipients: input.recipients === undefined ? null : [...new Set(input.recipients.map((email) => email.toLowerCase()))].sort() };
    const fingerprint = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
    const existing = await Job.findOne({ owner: admin._id, key }).lean();
    if (existing) {
        if (existing.fingerprint !== fingerprint) throw new AppError('This idempotency key was already used for another report.', 409);
        if (existing.state === 'queued') schedule(existing._id);
        return publicJob(existing);
    }
    if (!config.email?.from || !config.email?.smtp?.host || !config.email?.smtp?.auth?.user || !config.email?.smtp?.auth?.pass) throw new AppError('Report email is not configured. Set the existing SMTP environment settings.', 503);
    const { deliveries } = await recipientsFor(input, admin);
    if (!input.memberId && !deliveries.some((entry) => entry.combined)) throw new AppError('Select an administrator to receive the combined report.', 400);
    let job;
    try {
        job = await Job.create({ owner: admin._id, key, fingerprint, type: input.type, memberId: input.memberId, asOf: new Date(), deliveries, expiresAt: new Date(Date.now() + 7 * 86400000) });
    } catch (error) {
        if (error.code !== 11000) throw error;
        return startJob(input, admin, key);
    }
    schedule(job._id);
    return publicJob(job);
}

async function retryJob(id, admin) {
    const job = await Job.findOneAndUpdate({ _id: id, owner: admin._id, state: 'complete', 'deliveries.status': 'failed' }, {
        $set: { state: 'queued', 'deliveries.$[failed].status': 'pending' },
    }, { arrayFilters: [{ 'failed.status': 'failed' }], new: true }).lean();
    if (!job) return publicJob(await getJob(id, admin));
    schedule(id);
    return publicJob(job);
}

module.exports = { loadReport, recipientsFor, startJob, getJob, publicJob, retryJob, deliverJob };
