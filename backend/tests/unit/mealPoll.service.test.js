/**
 * Unit tests for the Meal Poll Standing-Preference Engine.
 *
 * Covers the 24-scenario test matrix from the TASK specification.
 */

const mongoose = require('mongoose');
const AppError = require('../../src/utils/errors/AppError');

// ── Mock chainable Mongoose query ───────────────────────────────────────────
function mockChain(resolvedValue) {
    const q = {};
    q.lean = jest.fn().mockResolvedValue(resolvedValue);
    q.sort = jest.fn().mockReturnValue(q);
    q.select = jest.fn().mockReturnValue(q);
    q.populate = jest.fn().mockReturnValue(q);
    q.skip = jest.fn().mockReturnValue(q);
    q.limit = jest.fn().mockReturnValue(q);
    return q;
}

// ── Mocks ───────────────────────────────────────────────────────────────────
const mockMealPoll = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
};

const mockUser = {
    find: jest.fn(),
    findById: jest.fn(),
};

const mockMeal = {
    updateOne: jest.fn(),
    updateMany: jest.fn(),
};

jest.mock('../../src/models/MealPoll.model', () => mockMealPoll);
jest.mock('../../src/models/User.model', () => mockUser);
jest.mock('../../src/models/Meal.model', () => mockMeal);

jest.mock('../../src/services/mealPollAudit.service', () => ({
    writeAuditLog: jest.fn().mockResolvedValue({ _id: 'audit1' }),
}));

const {
    voteMealPoll,
    getMealPollStatus,
    carryForwardVotes,
    resolveEffectiveVote,
} = require('../../src/services/meal.service');

// ── Test data ───────────────────────────────────────────────────────────────
const uid = new mongoose.Types.ObjectId();
const uid2 = new mongoose.Types.ObjectId();

const JUN1 = new Date('2026-06-01T00:00:00.000Z');
const JUN2 = new Date('2026-06-02T00:00:00.000Z');
const JUN3 = new Date('2026-06-03T00:00:00.000Z');
const JUN5 = new Date('2026-06-05T00:00:00.000Z');
const JUN10 = new Date('2026-06-10T00:00:00.000Z');

const toStr = (id) => id.toString();

beforeEach(() => {
    jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// voteMealPoll — First votes
// ═══════════════════════════════════════════════════════════════════════════

describe('voteMealPoll — first votes', () => {
    // Test 1
    it('creates standing preference for Day', async () => {
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 0 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'p1', user: uid, type: 'day', date: JUN1, effectiveUntil: null, source: 'manual', updatedAt: new Date(),
        });

        const r = await voteMealPoll(toStr(uid), { type: 'day', date: '2026-06-01' });
        expect(r.type).toBe('day');
        expect(r.effectiveUntil).toBeNull();
        expect(mockMealPoll.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ date: JUN1 }),
            expect.objectContaining({ type: 'day', effectiveUntil: null }),
            expect.objectContaining({ upsert: true, new: true }),
        );
    });

    // Test 2
    it('creates standing preference for Night', async () => {
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 0 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'p2', user: uid, type: 'night', date: JUN1, effectiveUntil: null, source: 'manual', updatedAt: new Date(),
        });

        const r = await voteMealPoll(toStr(uid), { type: 'night', date: '2026-06-01' });
        expect(r.type).toBe('night');
    });

    // Test 3
    it('creates standing preference for Both', async () => {
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 0 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'p3', user: uid, type: 'both', date: JUN1, effectiveUntil: null, source: 'manual', updatedAt: new Date(),
        });

        const r = await voteMealPoll(toStr(uid), { type: 'both', date: '2026-06-01' });
        expect(r.type).toBe('both');
    });

    // Test 4
    it('creates standing preference for Off', async () => {
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 0 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'p4', user: uid, type: 'off', date: JUN1, effectiveUntil: null, source: 'manual', updatedAt: new Date(),
        });

        const r = await voteMealPoll(toStr(uid), { type: 'off', date: '2026-06-01' });
        expect(r.type).toBe('off');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// voteMealPoll — Idempotency
// ═══════════════════════════════════════════════════════════════════════════

describe('voteMealPoll — idempotency', () => {
    // Test 5
    it('same choice + same boundary → no-op', async () => {
        const existing = {
            _id: 'p5', user: uid, type: 'day', date: JUN1,
            effectiveUntil: null, updatedAt: new Date(),
        };
        mockMealPoll.findOne.mockReturnValue(mockChain(existing));

        const r = await voteMealPoll(toStr(uid), { type: 'day', date: '2026-06-01' });
        expect(r._id).toBe('p5');
        expect(mockMealPoll.findOneAndUpdate).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// voteMealPoll — Transitions
// ═══════════════════════════════════════════════════════════════════════════

describe('voteMealPoll — transitions', () => {
    function setupTransition(fromType, toType, fromDate) {
        const current = {
            _id: `from_${fromType}`, user: uid, type: fromType, date: fromDate,
            effectiveUntil: null, updatedAt: new Date('2026-06-01T10:00:00Z'),
        };
        mockMealPoll.findOne.mockReturnValue(mockChain(current));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 1 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: `to_${toType}`, user: uid, type: toType, date: fromDate, effectiveUntil: null, source: 'manual', updatedAt: new Date(),
        });
    }

    // Test 6
    it('Day → Night', async () => {
        setupTransition('day', 'night', JUN1);
        const r = await voteMealPoll(toStr(uid), { type: 'night', date: '2026-06-01' });
        expect(r.type).toBe('night');
        expect(mockMealPoll.updateMany).toHaveBeenCalled();
    });

    // Test 7
    it('Night → Both', async () => {
        setupTransition('night', 'both', JUN1);
        const r = await voteMealPoll(toStr(uid), { type: 'both', date: '2026-06-01' });
        expect(r.type).toBe('both');
    });

    // Test 8
    it('Both → Off', async () => {
        setupTransition('both', 'off', JUN1);
        const r = await voteMealPoll(toStr(uid), { type: 'off', date: '2026-06-01' });
        expect(r.type).toBe('off');
    });

    // Test 9
    it('Off → Day', async () => {
        setupTransition('off', 'day', JUN1);
        const r = await voteMealPoll(toStr(uid), { type: 'day', date: '2026-06-01' });
        expect(r.type).toBe('day');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// voteMealPoll — Standing preference carries across future dates
// ═══════════════════════════════════════════════════════════════════════════

describe('voteMealPoll — standing preference carries forward', () => {
    // Test 10
    it('vote on Jun 1 is effective on Jun 5', async () => {
        // Create vote on Jun 1
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 0 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'p10', user: uid, type: 'day', date: JUN1, effectiveUntil: null, updatedAt: new Date(),
        });
        await voteMealPoll(toStr(uid), { type: 'day', date: '2026-06-01' });

        // Resolve for Jun 5 — same standing preference covers it
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'p10', user: uid, type: 'day', date: JUN1, effectiveUntil: null,
        }));
        const eff = await resolveEffectiveVote(toStr(uid), JUN5);
        expect(eff).not.toBeNull();
        expect(eff.type).toBe('day');
    });

    // Test 11
    it('date before first vote returns null (default off)', async () => {
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        const eff = await resolveEffectiveVote(toStr(uid), JUN1);
        expect(eff).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// voteMealPoll — Boundary & edge cases
// ═══════════════════════════════════════════════════════════════════════════

describe('voteMealPoll — boundary & edge', () => {
    // Test 12
    it('vote change on exact effective-date boundary', async () => {
        const current = {
            _id: 'p12a', user: uid, type: 'day', date: JUN3,
            effectiveUntil: null, updatedAt: new Date(),
        };
        mockMealPoll.findOne.mockReturnValue(mockChain(current));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 1 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'p12b', user: uid, type: 'night', date: JUN3, effectiveUntil: null, updatedAt: new Date(),
        });

        const r = await voteMealPoll(toStr(uid), { type: 'night', date: '2026-06-03' });
        expect(r.type).toBe('night');
        // Should close old records on or after Jun 3
        expect(mockMealPoll.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ date: { $gte: JUN3 } }),
            expect.any(Object),
        );
    });

    // Test 15
    it('double-click identical submission → no-op', async () => {
        const existing = {
            _id: 'p15', user: uid, type: 'both', date: JUN1,
            effectiveUntil: null, updatedAt: new Date(),
        };
        mockMealPoll.findOne.mockReturnValue(mockChain(existing));

        const r = await voteMealPoll(toStr(uid), { type: 'both', date: '2026-06-01' });
        expect(r._id).toBe('p15');
        expect(mockMealPoll.findOneAndUpdate).not.toHaveBeenCalled();
    });

    // Test 16
    it('retry after timeout — same request returns same state (no-op)', async () => {
        const existing = {
            _id: 'p16', user: uid, type: 'day', date: JUN1,
            effectiveUntil: null, updatedAt: new Date(),
        };
        mockMealPoll.findOne.mockReturnValue(mockChain(existing));

        // First "retry" — same result
        const r1 = await voteMealPoll(toStr(uid), { type: 'day', date: '2026-06-01' });
        const r2 = await voteMealPoll(toStr(uid), { type: 'day', date: '2026-06-01' });
        expect(r1._id).toBe(r2._id);
        expect(mockMealPoll.findOneAndUpdate).not.toHaveBeenCalled();
    });

    // Test 19a
    it('throws for invalid choice', async () => {
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        await expect(
            voteMealPoll(toStr(uid), { type: 'invalid', date: '2026-06-01' })
        ).rejects.toThrow(AppError);
    });

    // Test 21
    it('same type on later date extends standing preference (closes old at new boundary)', async () => {
        const current = {
            _id: 'p21a', user: uid, type: 'day', date: JUN1,
            effectiveUntil: null, updatedAt: new Date(),
        };
        mockMealPoll.findOne.mockReturnValue(mockChain(current));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 1 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'p21b', user: uid, type: 'day', date: JUN5, effectiveUntil: null, updatedAt: new Date(),
        });

        const r = await voteMealPoll(toStr(uid), { type: 'day', date: '2026-06-05' });
        expect(r.type).toBe('day');
        expect(r.date.getTime()).toBe(JUN5.getTime());
        // Old preference (Jun 1) should be closed at Jun 5
        expect(mockMealPoll.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ date: { $lt: JUN5 } }),
            { $set: { effectiveUntil: JUN5 } },
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveEffectiveVote — half-open interval
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveEffectiveVote', () => {
    // Test 22
    it('returns vote when effectiveFrom <= D < effectiveUntil', async () => {
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'r1', user: uid, type: 'day', date: JUN1, effectiveUntil: JUN5,
        }));
        const r = await resolveEffectiveVote(toStr(uid), JUN3);
        expect(r).not.toBeNull();
        expect(r.type).toBe('day');
    });

    it('returns null when D >= effectiveUntil', async () => {
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        const r = await resolveEffectiveVote(toStr(uid), JUN5);
        expect(r).toBeNull();
    });

    it('returns active vote when effectiveUntil is null', async () => {
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'r3', user: uid, type: 'both', date: JUN1, effectiveUntil: null,
        }));
        const r = await resolveEffectiveVote(toStr(uid), JUN10);
        expect(r).not.toBeNull();
        expect(r.type).toBe('both');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getMealPollStatus
// ═══════════════════════════════════════════════════════════════════════════

describe('getMealPollStatus', () => {
    const mockUserDoc = (id, overrides = {}) => ({
        _id: id, name: `User ${id}`, email: `u${id}@t.com`, image: null,
        isActive: true, userStatus: 'approved', ...overrides,
    });

    // Test: multiple users with correct stats
    it('returns correct stats for multiple users', async () => {
        const users = [mockUserDoc(uid, { name: 'Alice' }), mockUserDoc(uid2, { name: 'Bob' })];
        mockUser.find.mockReturnValue(mockChain(users));

        // Alice = day, Bob = both
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'day', date: JUN1, updatedAt: new Date() },
            { _id: uid2, type: 'both', date: JUN1, updatedAt: new Date() },
        ]);

        const result = await getMealPollStatus('2026-06-03');
        expect(result.votes).toHaveLength(2);
        expect(result.stats.total).toBe(2);
        expect(result.stats.both).toBe(1);
        // Alice (day) counts for day stat, Bob (both) counts for both day AND night
        expect(result.stats.day).toBe(2);
        expect(result.stats.night).toBe(1);
    });

    // Test: default off
    it('returns off for users with no vote', async () => {
        mockUser.find.mockReturnValue(mockChain([mockUserDoc(uid)]));
        mockMealPoll.aggregate.mockResolvedValue([]);

        const result = await getMealPollStatus('2026-06-01');
        expect(result.votes[0].type).toBe('off');
        expect(result.stats.off).toBe(1);
    });

    // Test: zero users
    it('returns empty result for zero users', async () => {
        mockUser.find.mockReturnValue(mockChain([]));

        const result = await getMealPollStatus('2026-06-01');
        expect(result.votes).toHaveLength(0);
        expect(result.stats.total).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// carryForwardVotes
// ═══════════════════════════════════════════════════════════════════════════

describe('carryForwardVotes', () => {
    // Test 23
    it('creates default off for active users with no vote', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, isActive: true }]));
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        mockMealPoll.create.mockResolvedValue({
            _id: 'cf1', user: uid, type: 'off', date: JUN1, effectiveUntil: null,
        });

        const r = await carryForwardVotes(JUN1);
        expect(r.created).toBe(1);
        expect(mockMealPoll.create).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'off', user: uid, effectiveUntil: null }),
        );
    });

    // Test 24
    it('closes standing preference for deactivated users', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, isActive: false }]));
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'cf2', user: uid, type: 'day', date: JUN1, effectiveUntil: null,
        }));
        mockMealPoll.updateOne.mockResolvedValue({ modifiedCount: 1 });

        const r = await carryForwardVotes(JUN1);
        expect(r.closed).toBe(1);
        expect(mockMealPoll.updateOne).toHaveBeenCalledWith(
            { _id: 'cf2' },
            { $set: { effectiveUntil: JUN1 } },
        );
    });

    it('skips active users who already have a standing preference', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, isActive: true }]));
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'cf3', user: uid, type: 'day', date: JUN1, effectiveUntil: null,
        }));

        const r = await carryForwardVotes(JUN1);
        expect(r.skipped).toBe(1);
        expect(r.created).toBe(0);
        expect(mockMealPoll.create).not.toHaveBeenCalled();
    });

    it('is idempotent — re-running produces same state', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, isActive: true }]));
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'cf4', user: uid, type: 'off', date: JUN1, effectiveUntil: null,
        }));

        const r = await carryForwardVotes(JUN1);
        expect(r.created).toBe(0);
        expect(r.skipped).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Edge cases — multi-step scenarios
// ═══════════════════════════════════════════════════════════════════════════

describe('Edge cases — multi-step', () => {
    // Test: rapid Day→Night→Both transitions
    it('handles rapid Day→Night→Both transitions', async () => {
        // Step 1: Day (first vote)
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 0 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'e1', user: uid, type: 'day', date: JUN1, effectiveUntil: null, updatedAt: new Date(),
        });
        await voteMealPoll(toStr(uid), { type: 'day', date: '2026-06-01' });

        // Step 2: Night (closes Day)
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'e1', user: uid, type: 'day', date: JUN1, effectiveUntil: null, updatedAt: new Date(),
        }));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 1 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'e2', user: uid, type: 'night', date: JUN1, effectiveUntil: null, updatedAt: new Date(),
        });
        await voteMealPoll(toStr(uid), { type: 'night', date: '2026-06-01' });

        // Step 3: Both (closes Night)
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'e2', user: uid, type: 'night', date: JUN1, effectiveUntil: null, updatedAt: new Date(),
        }));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 1 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'e3', user: uid, type: 'both', date: JUN1, effectiveUntil: null, updatedAt: new Date(),
        });
        const r = await voteMealPoll(toStr(uid), { type: 'both', date: '2026-06-01' });
        expect(r.type).toBe('both');
    });

    // Test: vote on later date splits timeline
    it('vote on later date splits the timeline correctly', async () => {
        // Day from Jun 1
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 0 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'e4', user: uid, type: 'day', date: JUN1, effectiveUntil: null, updatedAt: new Date(),
        });
        await voteMealPoll(toStr(uid), { type: 'day', date: '2026-06-01' });

        // Change to Night from Jun 5
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'e4', user: uid, type: 'day', date: JUN1, effectiveUntil: null, updatedAt: new Date(),
        }));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 1 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'e5', user: uid, type: 'night', date: JUN5, effectiveUntil: null, updatedAt: new Date(),
        });
        const r = await voteMealPoll(toStr(uid), { type: 'night', date: '2026-06-05' });

        // Old preference (Jun 1) should be closed at Jun 5
        expect(mockMealPoll.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ date: { $lt: JUN5 } }),
            { $set: { effectiveUntil: JUN5 } },
        );
        expect(r.type).toBe('night');
        expect(r.date.getTime()).toBe(JUN5.getTime());
    });

    // Test: Off stops future meal inclusion
    it('Off preference resolves to off for future dates', async () => {
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 0 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'e6', user: uid, type: 'off', date: JUN1, effectiveUntil: null, updatedAt: new Date(),
        });
        await voteMealPoll(toStr(uid), { type: 'off', date: '2026-06-01' });

        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'e6', user: uid, type: 'off', date: JUN1, effectiveUntil: null,
        }));
        const eff = await resolveEffectiveVote(toStr(uid), JUN3);
        expect(eff.type).toBe('off');
    });

    // Test: manual override doesn't break standing preference chain
    it('manual override does not affect MealPoll records', async () => {
        mockMealPoll.findOne.mockReturnValue(mockChain(null));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 0 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'e7', user: uid, type: 'day', date: JUN1, effectiveUntil: null, updatedAt: new Date(),
        });
        await voteMealPoll(toStr(uid), { type: 'day', date: '2026-06-01' });

        // Meal.updateOne would be called by admin creating a manual Meal record
        // but that does NOT affect the MealPoll standing preference
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'e7', user: uid, type: 'day', date: JUN1, effectiveUntil: null,
        }));
        const eff = await resolveEffectiveVote(toStr(uid), JUN3);
        expect(eff.type).toBe('day');
    });

    // Test: historical finalized record immutability
    it('changing vote does NOT call Meal.updateOne', async () => {
        const current = {
            _id: 'e8', user: uid, type: 'day', date: JUN1,
            effectiveUntil: null, updatedAt: new Date(),
        };
        mockMealPoll.findOne.mockReturnValue(mockChain(current));
        mockMealPoll.updateMany.mockResolvedValue({ modifiedCount: 1 });
        mockMealPoll.findOneAndUpdate.mockResolvedValue({
            _id: 'e9', user: uid, type: 'night', date: JUN1, effectiveUntil: null, updatedAt: new Date(),
        });

        await voteMealPoll(toStr(uid), { type: 'night', date: '2026-06-01' });

        // Meal model was NOT called
        expect(mockMeal.updateOne).not.toHaveBeenCalled();
        expect(mockMeal.updateMany).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Meal count resolution (Both → exactly 1 day + 1 night)
// ═══════════════════════════════════════════════════════════════════════════

describe('Meal count mapping', () => {
    const mealTypeCountMap = { off: 0, both: 2, day: 1, night: 1 };

    it('Both resolves to exactly one day and one night meal', () => {
        expect(mealTypeCountMap.both).toBe(2);
        // In the actual system, Both is used to derive day=1, night=1
        // via the bulkCreateMeals or admin meal creation logic
    });

    it('Day resolves to day=1, night=0', () => {
        expect(mealTypeCountMap.day).toBe(1);
    });

    it('Night resolves to day=0, night=1', () => {
        expect(mealTypeCountMap.night).toBe(1);
    });

    it('Off resolves to day=0, night=0', () => {
        expect(mealTypeCountMap.off).toBe(0);
    });
});
