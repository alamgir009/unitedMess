const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
jest.mock('../../src/config/index', () => ({ jwt: { secret: 'report-test-secret' }, email: { from: 'admin@example.com', smtp: { host: 'test', auth: { user: 'test', pass: 'test' } } } }));
jest.mock('../../src/services/email.service', () => ({ sendAnalyticsReportEmail: jest.fn().mockResolvedValue(true) }));
jest.mock('../../src/services/analyticsReportPdf.service', () => ({
    generateAnalyticsPDF: jest.fn(async (report) => Buffer.from(JSON.stringify(report))),
    filename: jest.fn(() => 'analytics-both-all-2026-11.pdf'),
    streamAnalyticsPDF: jest.requireActual('../../src/services/analyticsReportPdf.service').streamAnalyticsPDF,
    validateReport: jest.requireActual('../../src/services/analyticsReportPdf.service').validateReport,
}));
jest.mock('../../src/models/AnalyticsReportJob.model', () => ({ init: jest.fn().mockResolvedValue(), findOne: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn(), create: jest.fn() }));
const User = require('../../src/models/User.model');
const Job = require('../../src/models/AnalyticsReportJob.model');
const analytics = require('../../src/services/analytics.service');
const reports = require('../../src/services/analyticsReport.service');
const { sendAnalyticsReportEmail } = require('../../src/services/email.service');
const { fixture, now } = require('../fixtures/analyticsReport.fixture');
const routes = require('../../src/api/v1/routes/analytics.routes');
jest.setTimeout(30000);
const id = (index) => String(index).padStart(24, '0');
const accessToken = (userId) => jwt.sign({ sub: userId, type: 'access' }, 'report-test-secret', { expiresIn: '30m' });
const admin = { _id: id(99), name: 'Admin', email: 'admin@example.com', role: 'admin', isActive: true, changedPasswordAfter: () => false };
const people = [
    { _id: id(1), name: 'Alice', email: 'alice@example.com', role: 'user' },
    { _id: id(2), name: 'Bob', email: 'bob@example.com', role: 'user' },
    { _id: id(3), name: 'No email', role: 'user' },
    admin,
];
let store;
const clone = (value) => {
    if (value instanceof Date) return new Date(value);
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, entry]) => typeof entry !== 'function').map(([key, entry]) => [key, clone(entry)]));
    return value ?? null;
};
const query = (value) => ({ select() { return this; }, sort() { return this; }, lean: async () => clone(value) });
const matches = (entry, filter) => Object.entries(filter).every(([key, value]) => key === 'deliveries.status' ? entry.deliveries.some((recipient) => recipient.status === value) : String(entry[key]) === String(value));

beforeEach(() => {
    admin.role = 'admin';
    store = new Map();
    jest.clearAllMocks();
    jest.spyOn(global, 'setImmediate').mockImplementation(() => 0);
    jest.spyOn(User, 'find').mockImplementation((filter) => query(people.filter((person) => (!filter._id || person._id === String(filter._id)) && (!filter.role || person.role === filter.role))));
    jest.spyOn(User, 'findOne').mockImplementation((filter) => query(people.find((person) => person._id === String(filter._id) && (!filter.role || person.role === filter.role))));
    jest.spyOn(User, 'findById').mockResolvedValue(admin);
    jest.spyOn(analytics, 'getReport').mockImplementation(async (type, memberId) => fixture(memberId)[type]);
    Job.findOne.mockImplementation((filter) => query([...store.values()].find((entry) => matches(entry, filter))));
    Job.create.mockImplementation(async (input) => {
        if ([...store.values()].some((entry) => entry.owner === input.owner && entry.key === input.key)) throw Object.assign(new Error('duplicate'), { code: 11000 });
        const entry = { ...clone(input), _id: id(store.size + 100), state: 'queued' };
        store.set(entry._id, entry);
        return clone(entry);
    });
    Job.findOneAndUpdate.mockImplementation((filter, update) => {
        const entry = [...store.values()].find((value) => matches(value, filter));
        if (entry) for (const [key, value] of Object.entries(update.$set)) {
            if (key === 'deliveries.$[failed].status') entry.deliveries.forEach((recipient) => { if (recipient.status === 'failed') recipient.status = value; });
            else entry[key] = value;
        }
        return query(entry);
    });
    Job.updateOne.mockImplementation(async (filter, update) => {
        const entry = store.get(filter._id);
        if (update.$set.state) entry.state = update.$set.state;
        else entry.deliveries.find((recipient) => recipient.recipientId === filter['deliveries.recipientId']).status = update.$set['deliveries.$.status'];
    });
});
afterEach(() => jest.restoreAllMocks());

test('report data calls the exact dashboard aggregation and retains both snapshots and timezone boundaries', async () => {
    const report = await reports.loadReport('both', id(1), now);
    expect(analytics.getReport).toHaveBeenCalledWith('market', id(1), now);
    expect(analytics.getReport).toHaveBeenCalledWith('meal', id(1), now);
    expect(report.market).toEqual(await analytics.getReport('market', id(1), now));
    expect(report.meal).toEqual(await analytics.getReport('meal', id(1), now));
    expect(report.market.monthly.map((row) => row.amount)).toEqual(['1.10', '1.10', '1.10']);
});

test('bulk emails contain only each recipient’s member data; combined data goes to administrators; missing email is skipped', async () => {
    const job = await reports.startJob({ type: 'both', months: 3 }, admin, 'bulk-idempotency-key');
    await reports.deliverJob(job.jobId);
    expect(sendAnalyticsReportEmail).toHaveBeenCalledTimes(4);
    for (const [to, report, pdf] of sendAnalyticsReportEmail.mock.calls) {
        if (to === admin.email && !report.memberId) continue;
        const member = people.find((person) => person.email === to);
        expect(report.memberId).toBe(member._id);
        expect(report.market.members.every((entry) => entry.memberId === member._id)).toBe(true);
        expect(report.meal.members.every((entry) => entry.memberId === member._id)).toBe(true);
        expect(JSON.parse(pdf.toString()).people.every((entry) => entry._id === member._id)).toBe(true);
    }
    const result = reports.publicJob(await reports.getJob(job.jobId, admin));
    expect(result.recipients.find((entry) => entry.recipientId === `member:${id(3)}`).status).toBe('skipped');
    expect(JSON.stringify(result)).not.toMatch(/@/);
    expect(result.recipients.every((entry) => !Object.hasOwn(entry, 'email'))).toBe(true);
    expect(result.state).toBe('complete');
    await expect(reports.recipientsFor({ type: 'both', recipients: ['alice@example.com'] }, admin)).rejects.toMatchObject({ statusCode: 400 });
});

test('idempotent duplicate and concurrent requests return one job and send once; mismatched reuse returns 409', async () => {
    const input = { type: 'market', memberId: id(1), months: 3 };
    const [first, duplicate] = await Promise.all([reports.startJob(input, admin, 'duplicate-key-test'), reports.startJob(input, admin, 'duplicate-key-test')]);
    expect(duplicate.jobId).toBe(first.jobId);
    expect(store.size).toBe(1);
    await Promise.all([reports.deliverJob(first.jobId), reports.deliverJob(first.jobId)]);
    expect(sendAnalyticsReportEmail).toHaveBeenCalledTimes(1);
    expect((await reports.startJob(input, admin, 'duplicate-key-test')).jobId).toBe(first.jobId);
    await expect(reports.startJob({ ...input, type: 'meal' }, admin, 'duplicate-key-test')).rejects.toMatchObject({ statusCode: 409 });
});

test('retries send failed recipients only and concurrent retry requests do not requeue sent recipients', async () => {
    sendAnalyticsReportEmail.mockRejectedValueOnce(new Error('SMTP failure'));
    const job = await reports.startJob({ type: 'both', recipients: [admin.email] }, admin, 'retry-failed-key');
    await reports.deliverJob(job.jobId);
    expect(store.get(job.jobId).deliveries.filter((entry) => entry.status === 'failed')).toHaveLength(1);
    const sentBefore = sendAnalyticsReportEmail.mock.calls.length;
    await Promise.all([reports.retryJob(job.jobId, admin), reports.retryJob(job.jobId, admin)]);
    await reports.deliverJob(job.jobId);
    expect(sendAnalyticsReportEmail.mock.calls.length).toBe(sentBefore + 1);
});

test('a bulk job limits concurrent PDF/email work to five recipients', async () => {
    const job = await reports.startJob({ type: 'both' }, admin, 'concurrency-test-key');
    const stored = store.get(job.jobId);
    stored.deliveries = Array.from({ length: 17 }, (_, index) => ({ ...stored.deliveries[0], recipientId: `member:${id(index + 1)}`, status: 'pending' }));
    jest.spyOn(User, 'findOne').mockImplementation(() => query(people[0]));
    let active = 0;
    let maximum = 0;
    sendAnalyticsReportEmail.mockImplementation(async () => {
        active++;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active--;
    });
    await reports.deliverJob(job.jobId);
    expect(maximum).toBe(5);
    expect(sendAnalyticsReportEmail).toHaveBeenCalledTimes(17);
    sendAnalyticsReportEmail.mockResolvedValue(true);
});

test('uncertain delivery acknowledgements are marked interrupted and never replayed', async () => {
    const job = await reports.startJob({ type: 'market', memberId: id(1) }, admin, 'uncertain-delivery-key');
    Job.updateOne.mockRejectedValueOnce(new Error('Database acknowledgement lost'));
    await reports.deliverJob(job.jobId);
    expect(store.get(job.jobId).state).toBe('interrupted');
    await reports.retryJob(job.jobId, admin);
    await reports.deliverJob(job.jobId);
    expect(sendAnalyticsReportEmail).toHaveBeenCalledTimes(1);
});

test('streamed PDF totals equal the dashboard API totals for the same member', async () => {
    const PDFDocument = require('pdfkit');
    const { formatMoney, sumMoney } = require('../../src/utils/helpers/analyticsReport.helper.cjs');
    const seen = jest.spyOn(PDFDocument.prototype, 'text');
    const app = express();
    app.use('/admin/analytics', routes);
    const token = accessToken(admin._id);
    const dashboard = await request(app).get(`/admin/analytics/market?memberId=${id(1)}&months=3`).set('Authorization', `Bearer ${token}`);
    const pdf = await request(app).get(`/admin/analytics/report.pdf?type=market&memberId=${id(1)}&months=3`).set('Authorization', `Bearer ${token}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.headers['content-disposition']).toContain('attachment; filename=');
    expect(pdf.headers['cache-control']).toBe('private, no-store');
    expect(seen.mock.calls.some(([value]) => value === formatMoney(sumMoney(dashboard.body.data.monthly)))).toBe(true);
    expect(pdf.body.subarray(0, 5).toString()).toBe('%PDF-');
    seen.mockRestore();
});

test('real RBAC returns 403 on every report route; validates filters, idempotency keys and owner scope', async () => {
    const app = express();
    app.use(express.json());
    app.use('/admin/analytics', routes);
    app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
    const token = accessToken(admin._id);
    const get = (path) => request(app).get(`/admin/analytics/${path}`).set('Authorization', `Bearer ${token}`);
    const post = (path) => request(app).post(`/admin/analytics/${path}`).set('Authorization', `Bearer ${token}`);
    admin.role = 'user';
    for (const path of ['report.pdf?type=both', 'report/recipients?type=meal', `report/jobs/${id(100)}`]) expect((await get(path)).status).toBe(403);
    expect((await post('report/email').send({ type: 'both' })).status).toBe(403);
    expect((await post(`report/jobs/${id(100)}/retry`).send({})).status).toBe(403);
    admin.role = 'admin';
    for (const path of ['report.pdf?type=bad', 'report.pdf?type=meal&months=4', 'report.pdf?type=both&memberId=bad', 'report.pdf?type=both&unknown=x']) expect((await get(path)).status).toBe(400);
    expect((await post('report/email').send({ type: 'market' })).status).toBe(400);
    expect((await post('report/email').set('Idempotency-Key', 'valid-request-key').send({ type: 'market', recipients: ['bad'] })).status).toBe(400);
    await expect(reports.getJob(id(100), { _id: id(1000) })).rejects.toMatchObject({ statusCode: 404 });
});

test('email requests are rate limited per administrator', async () => {
    const limitedAdmin = { ...admin, _id: id(77) };
    jest.spyOn(User, 'findById').mockResolvedValue(limitedAdmin);
    const app = express();
    app.use(express.json());
    app.use('/admin/analytics', routes);
    app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
    const token = accessToken(limitedAdmin._id);
    const send = () => request(app).post('/admin/analytics/report/email').set('Authorization', `Bearer ${token}`).send({ type: 'invalid' });
    for (let index = 0; index < 10; index++) expect((await send()).status).toBe(400);
    expect((await send()).status).toBe(429);
});
