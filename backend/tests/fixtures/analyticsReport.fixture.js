const { getWindow } = require('../../src/services/analytics.service');
const { sumMoney } = require('../../src/utils/helpers/analyticsReport.helper.cjs');
const now = new Date('2026-11-20T10:00:00Z');
function fixture(memberId, count = 3, empty = false) {
    const people = Array.from({ length: count }, (_, index) => ({
        _id: String(index + 1).padStart(24, '0'),
        name: index === 0 ? 'Alice' : index === 1 ? 'অনুপম शर्मा' : `Member ${index + 1} with a long name for wrapping in the report table`,
    })).filter((entry) => !memberId || entry._id === memberId);
    const window = getWindow(now);
    const report = (type) => {
        const members = empty ? [] : people.flatMap((person, index) => window.months.map(({ month }) => ({
            memberId: person._id, name: person.name, month, count: type === 'market' ? 1 : 2,
            amount: type === 'market' ? `${index + 1}.10` : `${index + 2}.20`,
        })));
        const monthly = window.months.map((month) => ({ ...month, count: members.filter((row) => row.month === month.month).reduce((sum, row) => sum + row.count, 0), amount: sumMoney(members.filter((row) => row.month === month.month)), delta: empty ? null : '0.0' }));
        return {
            report: type, memberId: memberId || null, timezone: 'Asia/Kolkata', asOf: window.today, monthly, members,
            daily: window.months.flatMap(({ month, days }) => Array.from({ length: days }, (_, index) => ({ date: `${month}-${String(index + 1).padStart(2, '0')}`, count: index === 0 ? monthly[0].count : 0, amount: index === 0 ? monthly[0].amount : '0.00', members: [] }))),
        };
    };
    return { type: 'both', memberId, name: memberId ? people[0]?.name || 'Member' : 'All Members', people, market: report('market'), meal: report('meal'), generatedAt: now.toISOString() };
}
module.exports = { fixture, now };
