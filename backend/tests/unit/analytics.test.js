const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

jest.mock('../../src/config/index', () => ({ jwt: { secret: 'analytics-test-secret' } }));
const User = require('../../src/models/User.model');
const Market = require('../../src/models/Market.model');
const Meal = require('../../src/models/Meal.model');
const analytics = require('../../src/services/analytics.service');
const routes = require('../../src/api/v1/routes/analytics.routes');

const now = new Date('2026-11-16T10:00:00Z');
const ids = Array.from({ length: 4 }, () => new mongoose.Types.ObjectId());
const [alice, bob, inactive, deleted] = ids;
const integration = process.env.ANALYTICS_TEST_MONGO_URI ? test : test.skip;
let connected = false;

beforeAll(async () => {
    if (!process.env.ANALYTICS_TEST_MONGO_URI) return;
    await mongoose.connect(process.env.ANALYTICS_TEST_MONGO_URI, { dbName: `unitedmess_analytics_test_${process.pid}`, serverSelectionTimeoutMS: 5000, autoIndex: false });
    connected = true;
    await Promise.all([Market.createIndexes(), Meal.createIndexes()]);
    await User.collection.insertMany([
        { _id: alice, name: 'Alice', email: 'alice@example.com', isActive: true, userStatus: 'approved', chargePerGuestMeal: 60 },
        { _id: bob, name: 'Bob', email: 'bob@example.com', isActive: true, userStatus: 'approved', chargePerGuestMeal: 80 },
        { _id: inactive, name: 'Inactive', email: 'inactive@example.com', isActive: false, userStatus: 'approved' },
    ]);
    await Market.collection.insertMany([
        { user: alice, date: new Date('2026-08-31T18:29:59Z'), amount: 500 },
        { user: alice, date: new Date('2026-08-31T18:30:00Z'), amount: 0.1 },
        { user: bob, date: new Date('2026-09-01T00:00:00Z'), amount: 0.2 },
        { user: alice, date: new Date('2026-10-01T00:00:00Z'), amount: 40 },
        { user: alice, date: new Date('2026-11-01T00:00:00Z'), amount: 10 },
        { user: bob, date: new Date('2026-11-01T00:00:00Z'), amount: 20 },
        { user: inactive, date: new Date('2026-11-01T00:00:00Z'), amount: 999 },
        { user: deleted, date: new Date('2026-11-01T00:00:00Z'), amount: 777 },
        { user: alice, date: new Date('2026-11-17T00:00:00Z'), amount: 600 },
    ]);
    await Meal.collection.insertMany([
        { user: alice, date: new Date('2026-09-01T00:00:00Z'), mealCount: 1, guestCount: 0 },
        { user: bob, date: new Date('2026-09-01T00:00:00Z'), mealCount: 2, guestCount: 0 },
        { user: alice, date: new Date('2026-10-01T00:00:00Z'), mealCount: 4, guestCount: 0 },
        { user: alice, date: new Date('2026-11-01T00:00:00Z'), mealCount: 3, guestCount: 1 },
        { user: bob, date: new Date('2026-11-01T00:00:00Z'), mealCount: 2, guestCount: 0 },
    ]);
});

afterAll(async () => {
    jest.restoreAllMocks();
    if (connected) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
});

integration('market aggregation reconciles a manual query, IST boundaries, zero buckets and active member filters', async () => {
    const report = await analytics.getReport('market', undefined, now);
    const window = analytics.getWindow(now);
    const raw = await Market.collection.find({ user: { $in: [alice, bob] }, date: { $gte: window.start, $lt: window.end } }, { projection: { amount: 1 } }).toArray();
    // Independent manual query in this fixture only: 0.10 + 0.20 + 40 + 10 + 20 = 70.30.
    expect(raw.map((row) => Math.round(row.amount * 100)).reduce((a, b) => a + b, 0)).toBe(7030);
    expect(report.monthly.map((row) => Number(row.amount))).toEqual([0.3, 40, 30]);
    expect(report.monthly.map((row) => row.count)).toEqual([2, 1, 2]);
    expect(report.daily).toHaveLength(91);
    expect(report.daily.find((row) => row.date === '2026-09-02')).toMatchObject({ count: 0, amount: '0.00' });
    expect(report.daily.find((row) => row.date === '2026-11-17').count).toBe(0);
    expect(report.daily.find((row) => row.date === '2026-11-01')).toMatchObject({ count: 2, amount: '30.00', members: [
        { memberId: alice.toString(), name: 'Alice', count: 1, amount: '10.00' },
        { memberId: bob.toString(), name: 'Bob', count: 1, amount: '20.00' },
    ] });
    expect(report.daily.find((row) => row.date === '2026-09-02').members).toEqual([]);
    const filtered = await analytics.getReport('market', alice.toString(), now);
    expect(filtered.monthly.map((row) => Number(row.amount))).toEqual([0.1, 40, 10]);
    expect(filtered.members.every((row) => row.memberId === alice.toString())).toBe(true);
    expect(filtered.daily.find((row) => row.date === '2026-11-01').members.map((member) => member.memberId)).toEqual([alice.toString()]);
    expect((await analytics.searchMembers('ALICE@')).map((member) => member._id)).toEqual([alice]);
    expect(await analytics.searchMembers('Inactive')).toEqual([]);
    await expect(analytics.getReport('market', inactive.toString(), now)).rejects.toMatchObject({ statusCode: 404 });
    await expect(analytics.getReport('meal', deleted.toString(), now)).rejects.toMatchObject({ statusCode: 404 });
    const newYear = analytics.getWindow(new Date('2026-12-31T18:30:00Z'));
    expect(newYear.months.map((row) => row.month)).toEqual(['2026-11', '2026-12', '2027-01']);
    const empty = await analytics.getReport('market', undefined, new Date('2027-06-01T00:00:00Z'));
    expect(empty.monthly.map((row) => Number(row.amount))).toEqual([0, 0, 0]);
    expect(empty.monthly.every((row) => row.delta === null)).toBe(true);
});

integration('meal aggregation uses the global billing rate, includes guests, and reconciles daily and member amounts', async () => {
    const report = await analytics.getReport('meal', undefined, now);
    // November global spend = 1806; guest revenue = 60; own meals = 4; rate = 436.5.
    // Alice: 2 × 436.5 + 60 = 933. Bob: 2 × 436.5 = 873.
    expect(report.monthly.map((row) => Number(row.amount))).toEqual([0.3, 40, 1806]);
    expect(report.monthly[2]).toMatchObject({ count: 5, average: '361.20', delta: '4415.0' });
    expect(Number(report.daily.find((row) => row.date === '2026-11-01').amount)).toBe(1806);
    const filtered = await analytics.getReport('meal', alice.toString(), now);
    expect(Number(filtered.monthly[2].amount)).toBe(933);
    expect(filtered.monthly[2].count).toBe(3);
    expect(filtered.members.find((row) => row.month === '2026-11').amount).toBe('933.00');
});

test('real authentication/authorization blocks non-admins and validates admin report queries', async () => {
    const app = express();
    app.use('/admin/analytics', routes);
    app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
    const findUser = jest.spyOn(User, 'findById');
    const report = jest.spyOn(analytics, 'getReport').mockResolvedValue({ monthly: [] });
    const token = jwt.sign({ sub: alice.toString() }, 'analytics-test-secret');
    const send = (path) => request(app).get(`/admin/analytics/${path}`).set('Authorization', `Bearer ${token}`);
    const user = { role: 'user', isActive: true, changedPasswordAfter: () => false };
    findUser.mockImplementation(() => ({ select: async () => user }));
    for (const path of ['market', 'meal', 'members']) expect((await send(path)).status).toBe(403);
    expect(report).not.toHaveBeenCalled();
    expect((await request(app).get('/admin/analytics/market')).status).toBe(401);
    user.role = 'admin';
    for (const query of ['months=4', 'memberId=bad', 'months=3&months=3', 'memberId[$ne]=x', 'unexpected=x']) {
        expect((await send(`market?${query}`)).status).toBe(400);
    }
    expect((await send(`meal?months=3&memberId=${bob}`)).status).toBe(200);
    expect(report).toHaveBeenCalledWith('meal', bob.toString());
    user.isActive = false;
    expect((await send('market')).status).toBe(403);
    findUser.mockRestore();
    report.mockRestore();
});
