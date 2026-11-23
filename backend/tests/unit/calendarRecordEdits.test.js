const { marketService, mealService } = require('../../src/services');
const marketController = require('../../src/api/v1/controllers/market.controller');
const mealController = require('../../src/api/v1/controllers/meal.controller');
const Market = require('../../src/models/Market.model');
const Meal = require('../../src/models/Meal.model');
const User = require('../../src/models/User.model');
const actualMealService = jest.requireActual('../../src/services/meal.service');

jest.mock('../../src/services', () => ({
    marketService: jest.requireActual('../../src/services/market.service'),
    mealService: { getMealById: jest.fn(), updateMealById: jest.fn(), deleteMealById: jest.fn() },
}));
jest.mock('../../src/models/Market.model');
jest.mock('../../src/models/Meal.model');
jest.mock('../../src/models/User.model');
jest.mock('../../src/services/user.service', () => ({
    recalculateAllActiveUsersPayable: jest.fn().mockResolvedValue(undefined),
}));

const user = { id: 'member1', role: 'user' };
const invokeUpdate = (handler, body, actor = user) => new Promise((resolve, reject) => {
    const res = { status: () => res, json: resolve, send: resolve };
    handler({ params: { marketId: 'market1', mealId: 'meal1' }, body, user: actor }, res, reject);
});

describe('calendar record edit authorization and market validation', () => {
    let market;

    beforeEach(() => {
        jest.clearAllMocks();
        market = {
            _id: 'market1',
            user: { _id: 'member1' },
            amount: 510,
            date: new Date('2026-11-22'),
            isModified: (field) => !field || field === 'amount',
            set: jest.fn(),
            unmarkModified: jest.fn(),
            save: jest.fn().mockResolvedValue(undefined),
        };
        Market.findById.mockReturnValue({ select: jest.fn(), populate: jest.fn().mockResolvedValue(market) });
        Market.updateOne.mockResolvedValue({ matchedCount: 1 });
        User.updateOne.mockResolvedValue({ matchedCount: 1 });
    });

    it('returns 403 for another owner even if a member submits a forged owner or role', async () => {
        market.user._id = 'member2';
        mealService.getMealById.mockResolvedValue({ user: { _id: 'member2' } });
        const body = { user: 'member1', role: 'admin', items: 'Rice' };
        await expect(invokeUpdate(marketController.updateMarket, body)).rejects.toMatchObject({ statusCode: 403 });
        await expect(invokeUpdate(mealController.updateMeal, body)).rejects.toMatchObject({ statusCode: 403 });
        expect(market.save).not.toHaveBeenCalled();
        expect(mealService.updateMealById).not.toHaveBeenCalled();
    });

    it('rejects deletes from members who do not own the entry', async () => {
        market.user._id = 'member2';
        mealService.getMealById.mockResolvedValue({ user: { _id: 'member2' } });
        const forged = { user: 'member2', role: 'admin' };
        await expect(invokeUpdate(marketController.deleteMarket, forged)).rejects.toMatchObject({ statusCode: 403 });
        await expect(invokeUpdate(mealController.deleteMeal, forged)).rejects.toMatchObject({ statusCode: 403 });
        expect(market.save).not.toHaveBeenCalled();
        expect(mealService.deleteMealById).not.toHaveBeenCalled();
    });

    it.each(['', '   ', 'a 1b!c'])('rejects invalid items %j on single add, bulk add and edit', async (items) => {
        const body = { user: 'member1', userIds: ['member1'], date: '2026-11-22', amount: 510, items };
        const error = { statusCode: 400, message: expect.stringContaining('at least 4 letters') };
        await expect(marketService.createMarket(body)).rejects.toMatchObject(error);
        await expect(marketService.bulkCreateMarkets(body)).rejects.toMatchObject(error);
        await expect(invokeUpdate(marketController.updateMarket, body)).rejects.toMatchObject(error);
        expect(market.save).not.toHaveBeenCalled();
    });

    it.each([0, 1.234, Infinity, 'NaN', true])('rejects an invalid amount %j', async (amount) => {
        await expect(invokeUpdate(marketController.updateMarket, { amount })).rejects.toMatchObject({ statusCode: 400 });
        expect(market.save).not.toHaveBeenCalled();
    });

    it('updates another member’s entry as an admin and preserves stored ownership', async () => {
        await invokeUpdate(
            marketController.updateMarket,
            { user: 'other', items: '  কলমখ  ', amount: '520.25' },
            { id: 'admin1', role: 'admin' },
        );
        expect(Market.findById).toHaveBeenCalledTimes(1);
        expect(market).toMatchObject({ user: { _id: 'member1' }, items: 'কলমখ', amount: 520.25 });
        expect(User.updateOne).toHaveBeenCalledWith(
            expect.objectContaining({ _id: 'member1' }),
            { $inc: { totalMarketAmount: 10.25 }, $set: { 'calendarTotalRevisions.Market_market1': 1 } },
        );
    });
});

const date = new Date('2026-11-22');
const owner = { _id: 'member1' };
const types = [
    {
        name: 'market',
        Model: Market,
        update: marketService.updateMarketById,
        remove: marketService.deleteMarketById,
        initial: { amount: 510 },
        changes: { amount: 615.25 },
        delta: { totalMarketAmount: 105.25 },
        deleteDelta: { totalMarketAmount: -510 },
        relation: 'markets',
    },
    {
        name: 'meal',
        Model: Meal,
        update: actualMealService.updateMealById,
        remove: actualMealService.deleteMealById,
        initial: { type: 'both', isGuestMeal: false, mealCount: 2, guestCount: 0, source: 'manual' },
        changes: { isGuestMeal: true, guestCount: 3 },
        delta: { totalMeal: 3, guestMeal: 3 },
        deleteDelta: { totalMeal: -2, guestMeal: -0 },
        relation: 'meals',
    },
];

describe.each(types)('$name calendar total recovery', ({ Model, update, remove, initial, changes, delta, deleteDelta, relation }) => {
    let stored;
    let appliedRevision;
    let increments;
    let failure;
    let saveCount;

    const load = () => {
        const before = structuredClone(stored);
        const record = structuredClone(stored);
        Object.defineProperties(record, {
            isModified: { value: (field) => field
                ? !Object.is(record[field], before[field])
                : Object.keys(before).some((key) => JSON.stringify(record[key]) !== JSON.stringify(before[key])) },
            set: { value: () => {
                delete record.calendarTotals.increments;
                delete before.calendarTotals.increments;
            } },
            unmarkModified: { value: () => {} },
            save: { value: async () => {
                const { $where, ...persisted } = record;
                stored = structuredClone(persisted);
                saveCount++;
                if (failure === 'afterRecordWrite') {
                    failure = null;
                    throw new Error('Totals write unavailable');
                }
            } },
        });
        return record;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        stored = { _id: 'record1', user: owner, date, ...initial };
        appliedRevision = 0;
        increments = [];
        saveCount = 0;
        User.updateOne.mockImplementation(async (_, operation) => {
            if (failure === 'beforeWrite') {
                failure = null;
                throw new Error('Totals write unavailable');
            }
            const revision = Object.values(operation.$set)[0];
            if (appliedRevision >= revision) return { matchedCount: 0 };
            appliedRevision = revision;
            increments.push(operation.$inc);
            if (failure === 'afterWrite') {
                failure = null;
                throw new Error('Totals write unavailable');
            }
            return { matchedCount: 1 };
        });
        User.exists.mockImplementation(async () => appliedRevision > 0);
        Model.updateOne.mockImplementation(async (filter) => {
            if (failure === 'cleanup') {
                failure = null;
                throw new Error('Totals write unavailable');
            }
            if (stored.calendarTotals.revision === filter['calendarTotals.revision']) {
                delete stored.calendarTotals.increments;
            }
            return { matchedCount: 1 };
        });
    });

    it.each(['afterRecordWrite', 'beforeWrite', 'afterWrite', 'cleanup'])('settles once when retrying after %s failure', async (point) => {
        failure = point;
        await expect(update('record1', changes, load())).rejects.toThrow('Totals write unavailable');
        expect(stored).toMatchObject(changes);
        expect(stored.calendarTotals.increments).toEqual(delta);

        await update('record1', changes, load());
        await update('record1', changes, load());
        expect(increments).toEqual([delta]);
        expect(saveCount).toBe(1);
        expect(stored.calendarTotals).toEqual({ revision: 1 });
    });

    it.each(['afterWrite', 'cleanup'])('deletes and adjusts totals only once after %s failure', async (point) => {
        failure = point;
        Model.deleteOne.mockResolvedValue({ deletedCount: 1 });
        await expect(remove('record1', load())).rejects.toThrow('Totals write unavailable');
        expect(stored.calendarTotals).toMatchObject({ retireFor: 'record1', increments: deleteDelta });
        expect(Model.deleteOne).not.toHaveBeenCalled();

        await remove('record1', load());
        expect(increments).toEqual([deleteDelta]);
        expect(saveCount).toBe(1);
        expect(User.updateOne).toHaveBeenLastCalledWith(
            expect.objectContaining({ _id: 'member1' }),
            {
                $inc: deleteDelta,
                $set: { [`calendarTotalRevisions.${Model.modelName}_record1`]: 1 },
                $pull: { [relation]: 'record1' },
            },
        );
        expect(Model.deleteOne).toHaveBeenCalledWith({ _id: 'record1', 'calendarTotals.retireFor': 'record1' });
    });
});

it('finishes a meal replacement after the destination total update fails', async () => {
    jest.clearAllMocks();
    const start = new Date('2026-11-22');
    const target = new Date('2026-11-23');
    let destination = { _id: 'destination', user: owner, mealCount: 3, isGuestMeal: true, guestCount: 2 };
    const loadSource = () => ({
        _id: 'source', user: owner, date: start, type: 'both', isGuestMeal: false, mealCount: 2, guestCount: 0,
        isModified: () => true,
        save: jest.fn().mockResolvedValue(undefined),
    });
    const replacement = () => {
        const record = structuredClone(destination);
        Object.defineProperties(record, {
            save: { value: async () => { destination.calendarTotals = structuredClone(record.calendarTotals); } },
            set: { value: () => { delete record.calendarTotals.increments; } },
            unmarkModified: { value: () => {} },
        });
        return record;
    };
    Meal.findOne.mockImplementation(() => ({ select: async () => replacement() }));
    Meal.updateOne.mockImplementation(async () => { delete destination.calendarTotals.increments; });
    Meal.deleteOne.mockImplementation(async () => { destination = null; });
    User.updateOne
        .mockRejectedValueOnce(new Error('Totals write unavailable'))
        .mockResolvedValueOnce({ matchedCount: 1 });

    const first = loadSource();
    await expect(actualMealService.updateMealById('source', { date: '2026-11-23' }, first))
        .rejects.toThrow('Totals write unavailable');
    expect(first.save).not.toHaveBeenCalled();
    expect(Meal.deleteOne).not.toHaveBeenCalled();
    expect(destination.calendarTotals.retireFor).toBe('source');

    const retried = await actualMealService.updateMealById('source', { date: '2026-11-23' }, loadSource());
    expect(retried.date).toEqual(target);
    expect(destination).toBeNull();
    expect(User.updateOne).toHaveBeenLastCalledWith(
        expect.objectContaining({ _id: 'member1' }),
        {
            $inc: { totalMeal: -3, guestMeal: -2 },
            $set: { 'calendarTotalRevisions.Meal_destination': 1 },
            $pull: { meals: 'destination' },
        },
    );
});
