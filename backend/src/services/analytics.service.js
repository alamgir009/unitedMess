const mongoose = require('mongoose');
const Market = require('../models/Market.model');
const Meal = require('../models/Meal.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');

const TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET = 330 * 60 * 1000;
const decimal = (value) => ({ $toDecimal: { $toString: { $ifNull: [value, 0] } } });
const money = (value) => ({ $toString: { $round: [value, 2] } });
const dateKey = (format) => ({ $dateToString: { date: '$date', format, timezone: TIMEZONE } });
const activeMember = { isActive: true, userStatus: 'approved' };

function getWindow(now = new Date()) {
    const local = new Date(now.getTime() + IST_OFFSET);
    const year = local.getUTCFullYear();
    const month = local.getUTCMonth();
    const months = Array.from({ length: 3 }, (_, index) => {
        const first = new Date(Date.UTC(year, month - 2 + index, 1));
        const key = first.toISOString().slice(0, 7);
        return {
            month: key,
            label: new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(first),
            days: new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate(),
        };
    });
    return {
        months,
        start: new Date(`${months[0].month}-01T00:00:00+05:30`),
        end: new Date(Date.UTC(year, month, local.getUTCDate() + 1) - IST_OFFSET),
        today: local.toISOString().slice(0, 10),
    };
}

// Existing schemas store rupee Numbers. Convert their decimal text before any money arithmetic.
function ratePipeline(window, guestRate) {
    return [
        { $match: { date: { $gte: window.start, $lt: window.end } } },
        { $group: { _id: dateKey('%Y-%m'), count: { $sum: '$mealCount' }, guests: { $sum: '$guestCount' } } },
        { $lookup: {
            from: Market.collection.name,
            let: { month: '$_id' },
            pipeline: [
                { $match: { date: { $gte: window.start, $lt: window.end } } },
                { $match: { $expr: { $eq: [dateKey('%Y-%m'), '$$month'] } } },
                { $group: { _id: null, amount: { $sum: decimal('$amount') } } },
            ],
            as: 'spend',
        } },
        { $project: {
            _id: 0, month: '$_id',
            rate: { $cond: [
                { $gt: [{ $subtract: ['$count', '$guests'] }, 0] },
                { $round: [{ $divide: [
                    { $subtract: [{ $ifNull: [{ $arrayElemAt: ['$spend.amount', 0] }, 0] }, { $multiply: [decimal(guestRate), '$guests'] }] },
                    { $subtract: ['$count', '$guests'] },
                ] }, 4] },
                { $toDecimal: '0' },
            ] },
        } },
    ];
}

function buildPipeline(report, memberId, window, rates = []) {
    const isMarket = report === 'market';
    const match = { date: { $gte: window.start, $lt: window.end } };
    if (memberId) match.user = new mongoose.Types.ObjectId(memberId);
    const pipeline = [
        { $match: match },
        { $lookup: {
            from: User.collection.name, localField: 'user', foreignField: '_id',
            pipeline: [{ $match: activeMember }, { $project: { name: 1, email: 1, chargePerGuestMeal: 1 } }],
            as: 'member',
        } },
        { $unwind: '$member' },
        { $project: {
            user: 1, name: '$member.name', email: '$member.email', month: dateKey('%Y-%m'), day: dateKey('%Y-%m-%d'),
            count: isMarket ? { $literal: 1 } : '$mealCount',
            amount: isMarket ? { $round: [decimal('$amount'), 2] } : { $round: [{ $add: [
                { $multiply: [
                    { $subtract: ['$mealCount', { $ifNull: ['$guestCount', 0] }] },
                    { $ifNull: [{ $getField: { field: 'rate', input: { $arrayElemAt: [
                        { $filter: { input: { $literal: rates }, as: 'rate', cond: { $eq: ['$$rate.month', dateKey('%Y-%m')] } } }, 0,
                    ] } } }, { $toDecimal: '0' }] },
                ] },
                { $multiply: [{ $ifNull: ['$guestCount', 0] }, decimal({ $ifNull: ['$member.chargePerGuestMeal', 60] })] },
            ] }, 2] },
        } },
        { $facet: {
            monthly: [
                { $group: { _id: '$month', count: { $sum: '$count' }, amount: { $sum: '$amount' } } },
                { $project: { _id: 0, month: '$_id', count: 1, amount: 1 } },
            ],
            daily: [
                { $group: {
                    _id: { date: '$day', user: '$user' }, name: { $first: '$name' }, email: { $first: '$email' },
                    count: { $sum: '$count' }, amount: { $sum: '$amount' },
                } },
                { $sort: { '_id.date': 1, name: 1, email: 1, '_id.user': 1 } },
                { $group: {
                    _id: '$_id.date', count: { $sum: '$count' }, amount: { $sum: '$amount' },
                    members: { $push: { memberId: { $toString: '$_id.user' }, name: '$name', email: '$email', count: '$count', amount: money('$amount') } },
                } },
                { $project: { _id: 0, date: '$_id', count: 1, amount: money('$amount'), members: 1 } },
                { $sort: { date: 1 } },
            ],
            members: [
                { $group: {
                    _id: { memberId: '$user', month: '$month' }, name: { $first: '$name' }, email: { $first: '$email' },
                    count: { $sum: '$count' }, amount: { $sum: '$amount' },
                } },
                { $project: { _id: 0, memberId: { $toString: '$_id.memberId' }, month: '$_id.month', name: 1, email: 1, count: 1, amount: money('$amount') } },
                { $sort: { name: 1, memberId: 1, month: 1 } },
            ],
        } },
        { $set: { monthly: { $map: {
            input: { $literal: window.months }, as: 'calendar',
            in: { $mergeObjects: ['$$calendar', { count: 0, amount: { $toDecimal: '0' } }, { $arrayElemAt: [
                { $filter: { input: '$monthly', as: 'row', cond: { $eq: ['$$row.month', '$$calendar.month'] } } }, 0,
            ] }] },
        } } } },
        { $project: {
            daily: 1, members: 1,
            monthly: { $map: { input: { $range: [0, 3] }, as: 'index', in: { $let: {
                vars: { current: { $arrayElemAt: ['$monthly', '$$index'] }, previous: { $arrayElemAt: ['$monthly', { $subtract: ['$$index', 1] }] } },
                in: {
                    month: '$$current.month', label: '$$current.label', days: '$$current.days', count: '$$current.count',
                    amount: money('$$current.amount'),
                    average: money({ $cond: [{ $gt: ['$$current.count', 0] }, { $divide: ['$$current.amount', '$$current.count'] }, 0] }),
                    delta: { $cond: [
                        { $and: [{ $gt: ['$$index', 0] }, { $ne: ['$$previous.amount', 0] }] },
                        { $toString: { $round: [{ $multiply: [{ $divide: [{ $subtract: ['$$current.amount', '$$previous.amount'] }, { $abs: '$$previous.amount' }] }, 100] }, 1] } }, null,
                    ] },
                },
            } } } },
        } },
    ];
    return pipeline;
}

async function getReport(report, memberId, now = new Date()) {
    if (memberId && !await User.exists({ _id: memberId, ...activeMember })) {
        throw new AppError('Select an active, approved member.', 404);
    }
    const window = getWindow(now);
    let rates = [];
    if (report === 'meal') {
        const settings = await User.findOne(activeMember).select('chargePerGuestMeal').lean();
        rates = await Meal.aggregate(ratePipeline(window, settings?.chargePerGuestMeal || 60)).option({ maxTimeMS: 10000 });
    }
    const Model = report === 'market' ? Market : Meal;
    const [result] = await Model.aggregate(buildPipeline(report, memberId, window, rates)).option({ maxTimeMS: 10000 });
    const daily = new Map((result?.daily || []).map((row) => [row.date, row]));
    // Only pad calendar buckets here; every total, rate, average and delta is computed by MongoDB.
    return {
        report, timezone: TIMEZONE, asOf: window.today, memberId: memberId || null,
        monthly: result.monthly,
        daily: window.months.flatMap(({ month, days }) => Array.from({ length: days }, (_, index) => {
            const date = `${month}-${String(index + 1).padStart(2, '0')}`;
            return daily.get(date) || { date, count: 0, amount: '0.00', members: [] };
        })),
        members: result.members,
    };
}

async function searchMembers(search = '') {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = { ...activeMember };
    if (escaped) filter.$or = [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }];
    return User.find(filter).select('_id name email').sort({ name: 1, _id: 1 }).limit(50).lean();
}

module.exports = { getReport, searchMembers, getWindow, buildPipeline, ratePipeline, activeMember };
