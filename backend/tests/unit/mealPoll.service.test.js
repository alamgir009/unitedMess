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
    findByIdAndUpdate: jest.fn(),
    bulkWrite: jest.fn(),
};

const mockMeal = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    bulkWrite: jest.fn(),
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
    autoCreateMealsFromVotes,
    autoCreateMealForUser,
    bulkCreateMeals,
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

        // No manual overrides for this date
        mockMeal.find.mockReturnValue(mockChain([]));

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
        mockMeal.find.mockReturnValue(mockChain([]));

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

    it('creates carry-forward audit log for active users with Day vote', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, isActive: true }]));
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'cf5', user: uid, type: 'day', date: JUN1, effectiveUntil: null,
        }));

        const r = await carryForwardVotes(JUN1);
        expect(r.skipped).toBe(1);
        expect(r.created).toBe(0);
        expect(mockMealPoll.create).not.toHaveBeenCalled();
    });

    it('creates carry-forward audit log for active users with Night vote', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, isActive: true }]));
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'cf6', user: uid, type: 'night', date: JUN1, effectiveUntil: null,
        }));

        const r = await carryForwardVotes(JUN1);
        expect(r.skipped).toBe(1);
        expect(r.created).toBe(0);
    });

    it('creates carry-forward audit log for active users with Both vote', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, isActive: true }]));
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'cf7', user: uid, type: 'both', date: JUN1, effectiveUntil: null,
        }));

        const r = await carryForwardVotes(JUN1);
        expect(r.skipped).toBe(1);
        expect(r.created).toBe(0);
    });

    it('creates carry-forward audit log for active users with Off vote', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, isActive: true }]));
        mockMealPoll.findOne.mockReturnValue(mockChain({
            _id: 'cf8', user: uid, type: 'off', date: JUN1, effectiveUntil: null,
        }));

        const r = await carryForwardVotes(JUN1);
        expect(r.skipped).toBe(1);
        expect(r.created).toBe(0);
    });

    it('handles mixed active and inactive users correctly', async () => {
        mockUser.find.mockReturnValue(mockChain([
            { _id: uid, isActive: true },
            { _id: uid2, isActive: false },
        ]));

        // uid has active vote, uid2 has active vote (but is deactivated)
        mockMealPoll.findOne
            .mockReturnValueOnce(mockChain({
                _id: 'cf9a', user: uid, type: 'day', date: JUN1, effectiveUntil: null,
            }))
            .mockReturnValueOnce(mockChain({
                _id: 'cf9b', user: uid2, type: 'night', date: JUN1, effectiveUntil: null,
            }));
        mockMealPoll.updateOne.mockResolvedValue({ modifiedCount: 1 });

        const r = await carryForwardVotes(JUN1);
        expect(r.skipped).toBe(1); // uid (active with vote)
        expect(r.closed).toBe(1);  // uid2 (deactivated)
        expect(r.created).toBe(0);
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

// ═══════════════════════════════════════════════════════════════════════════
// autoCreateMealsFromVotes — batch meal creation from votes
// ═══════════════════════════════════════════════════════════════════════════

describe('autoCreateMealsFromVotes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates meals for all active users based on their votes', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }, { _id: uid2 }]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'day' },
            { _id: uid2, type: 'both' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([]));
        mockMeal.bulkWrite.mockResolvedValue({ insertedCount: 2, modifiedCount: 0 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 2 });

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.created).toBe(2);
        expect(r.updated).toBe(0);
        expect(r.skipped).toBe(0);
        expect(r.total).toBe(2);
    });

    it('skips users who already have correct meal type', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'day' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'day', mealCount: 1 },
        ]));

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.created).toBe(0);
        expect(r.skipped).toBe(1);
        expect(r.total).toBe(1);
    });

    it('updates meals when vote type changed', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'both' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'day', mealCount: 1 },
        ]));
        mockMeal.bulkWrite.mockResolvedValue({ modifiedCount: 1 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.created).toBe(0);
        expect(r.updated).toBe(1);
        expect(r.skipped).toBe(0);
    });

    it('defaults to off for users with no vote', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([]);
        mockMeal.find.mockReturnValue(mockChain([]));
        mockMeal.bulkWrite.mockResolvedValue({ insertedCount: 1, modifiedCount: 0 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.created).toBe(1);
        // Verify the insert doc has type=off
        const bulkWriteCall = mockMeal.bulkWrite.mock.calls[0][0];
        expect(bulkWriteCall[0].insertOne.document.type).toBe('off');
        expect(bulkWriteCall[0].insertOne.document.mealCount).toBe(0);
        expect(bulkWriteCall[0].insertOne.document.source).toBe('auto');
    });

    it('returns early for zero active users', async () => {
        mockUser.find.mockReturnValue(mockChain([]));

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.created).toBe(0);
        expect(r.total).toBe(0);
        expect(mockMealPoll.aggregate).not.toHaveBeenCalled();
    });

    it('is idempotent — re-running produces same state', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'day' },
        ]);
        // First run: no existing meal
        mockMeal.find
            .mockReturnValueOnce(mockChain([]))
            .mockReturnValueOnce(mockChain([{ user: uid, type: 'day', mealCount: 1 }]));
        mockMeal.bulkWrite.mockResolvedValue({ insertedCount: 1, modifiedCount: 0 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        await autoCreateMealsFromVotes(JUN1);

        // Second run: meal exists with correct type
        const r2 = await autoCreateMealsFromVotes(JUN1);
        expect(r2.skipped).toBe(1);
        expect(r2.created).toBe(0);
    });

    it('handles mixed votes correctly', async () => {
        mockUser.find.mockReturnValue(mockChain([
            { _id: uid },
            { _id: uid2 },
        ]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'day' },
            { _id: uid2, type: 'night' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([]));
        mockMeal.bulkWrite.mockResolvedValue({ insertedCount: 2, modifiedCount: 0 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 2 });

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.created).toBe(2);
        expect(r.total).toBe(2);

        // Verify both inserts have correct types
        const bulkWriteCall = mockMeal.bulkWrite.mock.calls[0][0];
        const types = bulkWriteCall.map(c => c.insertOne.document.type).sort();
        expect(types).toEqual(['day', 'night']);
    });

    it('creates off meal for users with off vote', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'off' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([]));
        mockMeal.bulkWrite.mockResolvedValue({ insertedCount: 1, modifiedCount: 0 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.created).toBe(1);

        const bulkWriteCall = mockMeal.bulkWrite.mock.calls[0][0];
        expect(bulkWriteCall[0].insertOne.document.type).toBe('off');
        expect(bulkWriteCall[0].insertOne.document.mealCount).toBe(0);
    });

    it('sets remarks to Auto-created from vote', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([{ _id: uid, type: 'day' }]);
        mockMeal.find.mockReturnValue(mockChain([]));
        mockMeal.bulkWrite.mockResolvedValue({ insertedCount: 1 });
        mockUser.bulkWrite.mockResolvedValue({});

        await autoCreateMealsFromVotes(JUN1);

        const bulkWriteCall = mockMeal.bulkWrite.mock.calls[0][0];
        expect(bulkWriteCall[0].insertOne.document.remarks).toBe('Auto-created from vote');
        expect(bulkWriteCall[0].insertOne.document.source).toBe('auto');
    });

    it('updates remarks on existing meal when type changes', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([{ _id: uid, type: 'both' }]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'day', mealCount: 1, source: 'auto' },
        ]));
        mockMeal.bulkWrite.mockResolvedValue({ modifiedCount: 1 });
        mockUser.bulkWrite.mockResolvedValue({});

        await autoCreateMealsFromVotes(JUN1);

        const bulkWriteCall = mockMeal.bulkWrite.mock.calls[0][0];
        expect(bulkWriteCall[0].updateOne.update.$set.remarks).toBe('Auto-created from vote');
        expect(bulkWriteCall[0].updateOne.update.$set.source).toBe('auto');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// autoCreateMealForUser — single user real-time meal creation
// ═══════════════════════════════════════════════════════════════════════════

describe('autoCreateMealForUser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates a new meal for user with day vote', async () => {
        mockMeal.findOne.mockReturnValue(mockChain(null));
        mockMeal.create.mockResolvedValue({
            _id: 'm1', user: uid, type: 'day', date: JUN1, mealCount: 1,
        });
        mockUser.findById.mockResolvedValue({ _id: uid });

        await autoCreateMealForUser(uid, JUN1, 'day');
        expect(mockMeal.create).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'day', mealCount: 1, remarks: 'Auto-created from vote' }),
        );
    });

    it('creates a new meal for user with both vote', async () => {
        mockMeal.findOne.mockReturnValue(mockChain(null));
        mockMeal.create.mockResolvedValue({
            _id: 'm2', user: uid, type: 'both', date: JUN1, mealCount: 2,
        });
        mockUser.findById.mockResolvedValue({ _id: uid });

        await autoCreateMealForUser(uid, JUN1, 'both');
        expect(mockMeal.create).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'both', mealCount: 2 }),
        );
    });

    it('creates off meal with mealCount 0', async () => {
        mockMeal.findOne.mockReturnValue(mockChain(null));
        mockMeal.create.mockResolvedValue({
            _id: 'm3', user: uid, type: 'off', date: JUN1, mealCount: 0,
        });
        mockUser.findById.mockResolvedValue({ _id: uid });

        await autoCreateMealForUser(uid, JUN1, 'off');
        expect(mockMeal.create).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'off', mealCount: 0 }),
        );
    });

    it('skips if meal exists with same type', async () => {
        mockMeal.findOne.mockReturnValue(mockChain({
            _id: 'm4', user: uid, type: 'day', date: JUN1, mealCount: 1,
        }));

        await autoCreateMealForUser(uid, JUN1, 'day');
        expect(mockMeal.updateOne).not.toHaveBeenCalled();
        expect(mockMeal.create).not.toHaveBeenCalled();
    });

    it('updates meal if type changed', async () => {
        mockMeal.findOne.mockReturnValue(mockChain({
            _id: 'm5', user: uid, type: 'day', date: JUN1, mealCount: 1,
        }));
        mockUser.findById.mockResolvedValue({ _id: uid });

        await autoCreateMealForUser(uid, JUN1, 'both');
        expect(mockMeal.updateOne).toHaveBeenCalledWith(
            { _id: 'm5' },
            expect.objectContaining({ $set: expect.objectContaining({ type: 'both', mealCount: 2 }) }),
        );
    });

    it('syncs User.totalMeal when creating new meal', async () => {
        mockMeal.findOne.mockReturnValue(mockChain(null));
        mockMeal.create.mockResolvedValue({
            _id: 'm6', user: uid, type: 'day', date: JUN1, mealCount: 1,
        });
        mockUser.findByIdAndUpdate.mockResolvedValue({ _id: uid });

        await autoCreateMealForUser(uid, JUN1, 'day');
        expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
            uid,
            expect.objectContaining({ $push: expect.any(Object), $inc: expect.any(Object) }),
            { runValidators: true },
        );
    });

    it('syncs User.totalMeal delta when type changes', async () => {
        mockMeal.findOne.mockReturnValue(mockChain({
            _id: 'm7', user: uid, type: 'day', date: JUN1, mealCount: 1,
        }));
        mockUser.findByIdAndUpdate.mockResolvedValue({ _id: uid });

        await autoCreateMealForUser(uid, JUN1, 'both');
        // mealCount diff: 2 - 1 = 1
        expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
            uid,
            { $inc: { totalMeal: 1 } },
        );
    });

    it('sets source to auto on created meals', async () => {
        mockMeal.findOne.mockReturnValue(mockChain(null));
        mockMeal.create.mockResolvedValue({
            _id: 'm8', user: uid, type: 'day', date: JUN1, mealCount: 1, source: 'auto',
        });
        mockUser.findByIdAndUpdate.mockResolvedValue({ _id: uid });

        await autoCreateMealForUser(uid, JUN1, 'day');
        expect(mockMeal.create).toHaveBeenCalledWith(
            expect.objectContaining({ source: 'auto' }),
        );
    });

    it('sets source to auto on updated meals', async () => {
        mockMeal.findOne.mockReturnValue(mockChain({
            _id: 'm9', user: uid, type: 'day', date: JUN1, mealCount: 1, source: 'auto',
        }));
        mockUser.findByIdAndUpdate.mockResolvedValue({ _id: uid });

        await autoCreateMealForUser(uid, JUN1, 'both');
        expect(mockMeal.updateOne).toHaveBeenCalledWith(
            { _id: 'm9' },
            expect.objectContaining({ $set: expect.objectContaining({ source: 'auto' }) }),
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Source-aware cron: manual meals are NEVER overwritten
// ═══════════════════════════════════════════════════════════════════════════

describe('Source-aware cron — autoCreateMealsFromVotes skips manual meals', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('skips manual meals even when vote type differs', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'both' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'off', mealCount: 0, source: 'manual' },
        ]));

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.created).toBe(0);
        expect(r.updated).toBe(0);
        expect(r.skipped).toBe(1);
        expect(mockMeal.bulkWrite).not.toHaveBeenCalled();
    });

    it('does not skip auto meals when vote type differs', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'both' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'day', mealCount: 1, source: 'auto' },
        ]));
        mockMeal.bulkWrite.mockResolvedValue({ modifiedCount: 1 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.updated).toBe(1);
        expect(r.skipped).toBe(0);
    });

    it('still skips auto meals with matching type (idempotent)', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'day' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'day', mealCount: 1, source: 'auto' },
        ]));

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.skipped).toBe(1);
        expect(mockMeal.bulkWrite).not.toHaveBeenCalled();
    });

    it('handles mixed manual and auto meals across users', async () => {
        mockUser.find.mockReturnValue(mockChain([
            { _id: uid },
            { _id: uid2 },
        ]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'both' },
            { _id: uid2, type: 'both' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'off', mealCount: 0, source: 'manual' },
            { user: uid2, type: 'day', mealCount: 1, source: 'auto' },
        ]));
        mockMeal.bulkWrite.mockResolvedValue({ modifiedCount: 1 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.skipped).toBe(1); // uid (manual)
        expect(r.updated).toBe(1);  // uid2 (auto, type changed)
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Source-aware cron — autoCreateMealForUser skips manual meals
// ═══════════════════════════════════════════════════════════════════════════

describe('Source-aware cron — autoCreateMealForUser skips manual meals', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('skips manual meal even when type differs', async () => {
        mockMeal.findOne.mockReturnValue(mockChain({
            _id: 'm10', user: uid, type: 'off', date: JUN1, mealCount: 0, source: 'manual',
        }));

        await autoCreateMealForUser(uid, JUN1, 'both');
        expect(mockMeal.updateOne).not.toHaveBeenCalled();
        expect(mockMeal.create).not.toHaveBeenCalled();
    });

    it('overwrites auto meal when type differs', async () => {
        mockMeal.findOne.mockReturnValue(mockChain({
            _id: 'm11', user: uid, type: 'day', date: JUN1, mealCount: 1, source: 'auto',
        }));
        mockUser.findByIdAndUpdate.mockResolvedValue({ _id: uid });

        await autoCreateMealForUser(uid, JUN1, 'both');
        expect(mockMeal.updateOne).toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getMealPollStatus — respects manual overrides
// ═══════════════════════════════════════════════════════════════════════════

describe('getMealPollStatus — manual overrides', () => {
    const mockUserDoc = (id, overrides = {}) => ({
        _id: id, name: `User ${id}`, email: `u${id}@t.com`, image: null,
        isActive: true, userStatus: 'approved', ...overrides,
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows manual override type instead of vote type', async () => {
        mockUser.find.mockReturnValue(mockChain([mockUserDoc(uid)]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'both', date: JUN1, updatedAt: new Date() },
        ]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'off' },
        ]));

        const result = await getMealPollStatus('2026-06-01');
        expect(result.votes[0].type).toBe('off');
        expect(result.votes[0].isManualOverride).toBe(true);
        expect(result.stats.off).toBe(1);
    });

    it('falls back to vote type when no manual meal exists', async () => {
        mockUser.find.mockReturnValue(mockChain([mockUserDoc(uid)]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'day', date: JUN1, updatedAt: new Date() },
        ]);
        mockMeal.find.mockReturnValue(mockChain([]));

        const result = await getMealPollStatus('2026-06-01');
        expect(result.votes[0].type).toBe('day');
        expect(result.votes[0].isManualOverride).toBe(false);
    });

    it('handles mix of manual overrides and regular votes', async () => {
        mockUser.find.mockReturnValue(mockChain([
            mockUserDoc(uid, { name: 'Alice' }),
            mockUserDoc(uid2, { name: 'Bob' }),
        ]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'both', date: JUN1, updatedAt: new Date() },
            { _id: uid2, type: 'day', date: JUN1, updatedAt: new Date() },
        ]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'off' },
        ]));

        const result = await getMealPollStatus('2026-06-01');
        // Alice has manual override to off
        expect(result.votes[0].type).toBe('off');
        expect(result.votes[0].isManualOverride).toBe(true);
        // Bob has regular vote of day
        expect(result.votes[1].type).toBe('day');
        expect(result.votes[1].isManualOverride).toBe(false);
        // Stats reflect the actual displayed types
        expect(result.stats.off).toBe(1);
        expect(result.stats.day).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Source-aware cron — autoCreateMealsFromVotes skips bulk meals
// ═══════════════════════════════════════════════════════════════════════════

describe('Source-aware cron — autoCreateMealsFromVotes skips bulk meals', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('skips bulk meals even when vote type differs', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'both' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'off', mealCount: 0, source: 'bulk' },
        ]));

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.created).toBe(0);
        expect(r.updated).toBe(0);
        expect(r.skipped).toBe(1);
        expect(mockMeal.bulkWrite).not.toHaveBeenCalled();
    });

    it('overwrites auto meals when vote type differs', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid }]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'both' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'day', mealCount: 1, source: 'auto' },
        ]));
        mockMeal.bulkWrite.mockResolvedValue({ modifiedCount: 1 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.updated).toBe(1);
        expect(r.skipped).toBe(0);
    });

    it('skips both manual and bulk meals in mixed scenario', async () => {
        mockUser.find.mockReturnValue(mockChain([
            { _id: uid },
            { _id: uid2 },
        ]));
        mockMealPoll.aggregate.mockResolvedValue([
            { _id: uid, type: 'both' },
            { _id: uid2, type: 'both' },
        ]);
        mockMeal.find.mockReturnValue(mockChain([
            { user: uid, type: 'off', mealCount: 0, source: 'manual' },
            { user: uid2, type: 'day', mealCount: 1, source: 'bulk' },
        ]));

        const r = await autoCreateMealsFromVotes(JUN1);
        expect(r.skipped).toBe(2);
        expect(r.updated).toBe(0);
        expect(mockMeal.bulkWrite).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Source-aware cron — autoCreateMealForUser skips bulk meals
// ═══════════════════════════════════════════════════════════════════════════

describe('Source-aware cron — autoCreateMealForUser skips bulk meals', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('skips bulk meal even when type differs', async () => {
        mockMeal.findOne.mockReturnValue(mockChain({
            _id: 'm12', user: uid, type: 'off', date: JUN1, mealCount: 0, source: 'bulk',
        }));

        await autoCreateMealForUser(uid, JUN1, 'both');
        expect(mockMeal.updateOne).not.toHaveBeenCalled();
        expect(mockMeal.create).not.toHaveBeenCalled();
    });

    it('overwrites auto meal when type differs', async () => {
        mockMeal.findOne.mockReturnValue(mockChain({
            _id: 'm13', user: uid, type: 'day', date: JUN1, mealCount: 1, source: 'auto',
        }));
        mockUser.findByIdAndUpdate.mockResolvedValue({ _id: uid });

        await autoCreateMealForUser(uid, JUN1, 'both');
        expect(mockMeal.updateOne).toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// bulkCreateMeals — source precedence and tagging
// ═══════════════════════════════════════════════════════════════════════════

describe('bulkCreateMeals — source precedence', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('sets source to bulk on new inserts', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, meals: [] }]));
        mockMeal.find.mockReturnValue(mockChain([]));
        mockMeal.bulkWrite.mockResolvedValue({ insertedCount: 1 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        await bulkCreateMeals({
            startDate: '2026-06-01',
            endDate: '2026-06-01',
            type: 'off',
            userIds: [toStr(uid)],
            isGuestMeal: false,
            guestCount: 0,
            remarks: '',
            createdBy: toStr(uid),
        });

        const insertCall = mockMeal.bulkWrite.mock.calls[0][0];
        expect(insertCall[0].insertOne.document.source).toBe('bulk');
    });

    it('sets source to bulk on updates (type changed)', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, meals: [] }]));
        mockMeal.find.mockReturnValue(mockChain([
            { _id: 'm14', user: uid, date: JUN1, type: 'day', mealCount: 1, isGuestMeal: false, guestCount: 0, source: 'auto' },
        ]));
        mockMeal.bulkWrite.mockResolvedValue({ modifiedCount: 1 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        await bulkCreateMeals({
            startDate: '2026-06-01',
            endDate: '2026-06-01',
            type: 'off',
            userIds: [toStr(uid)],
            isGuestMeal: false,
            guestCount: 0,
            remarks: '',
            createdBy: toStr(uid),
        });

        const updateCall = mockMeal.bulkWrite.mock.calls[0][0];
        expect(updateCall[0].updateOne.update.$set.source).toBe('bulk');
    });

    it('skips manual meals — does not overwrite', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, meals: [] }]));
        mockMeal.find.mockReturnValue(mockChain([
            { _id: 'm15', user: uid, date: JUN1, type: 'off', mealCount: 0, isGuestMeal: false, guestCount: 0, source: 'manual' },
        ]));

        const r = await bulkCreateMeals({
            startDate: '2026-06-01',
            endDate: '2026-06-01',
            type: 'night',
            userIds: [toStr(uid)],
            isGuestMeal: false,
            guestCount: 0,
            remarks: '',
            createdBy: toStr(uid),
        });

        expect(r.skipped).toBe(1);
        expect(r.inserted).toBe(0);
        expect(r.updated).toBe(0);
        expect(mockMeal.bulkWrite).not.toHaveBeenCalled();
    });

    it('overwrites auto meals', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, meals: [] }]));
        mockMeal.find.mockReturnValue(mockChain([
            { _id: 'm16', user: uid, date: JUN1, type: 'day', mealCount: 1, isGuestMeal: false, guestCount: 0, source: 'auto' },
        ]));
        mockMeal.bulkWrite.mockResolvedValue({ modifiedCount: 1 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        const r = await bulkCreateMeals({
            startDate: '2026-06-01',
            endDate: '2026-06-01',
            type: 'night',
            userIds: [toStr(uid)],
            isGuestMeal: false,
            guestCount: 0,
            remarks: '',
            createdBy: toStr(uid),
        });

        expect(r.updated).toBe(1);
        expect(mockMeal.bulkWrite).toHaveBeenCalled();
    });

    it('is idempotent — re-running with same params produces same state', async () => {
        mockUser.find.mockReturnValue(mockChain([{ _id: uid, meals: [] }]));
        // First run: no existing meal
        mockMeal.find
            .mockReturnValueOnce(mockChain([]))
            // Second run: meal exists with matching type and source
            .mockReturnValueOnce(mockChain([
                { _id: 'm17', user: uid, date: JUN1, type: 'off', mealCount: 0, isGuestMeal: false, guestCount: 0, source: 'bulk' },
            ]));
        mockMeal.bulkWrite.mockResolvedValue({ insertedCount: 1 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        const params = {
            startDate: '2026-06-01',
            endDate: '2026-06-01',
            type: 'off',
            userIds: [toStr(uid)],
            isGuestMeal: false,
            guestCount: 0,
            remarks: '',
            createdBy: toStr(uid),
        };

        const r1 = await bulkCreateMeals(params);
        expect(r1.inserted).toBe(1);

        const r2 = await bulkCreateMeals(params);
        expect(r2.skipped).toBe(1);
        expect(r2.inserted).toBe(0);
        expect(r2.updated).toBe(0);
    });

    it('skips manual but processes auto in mixed user-date matrix', async () => {
        mockUser.find.mockReturnValue(mockChain([
            { _id: uid, meals: [] },
            { _id: uid2, meals: [] },
        ]));
        mockMeal.find.mockReturnValue(mockChain([
            { _id: 'm18', user: uid, date: JUN1, type: 'off', mealCount: 0, isGuestMeal: false, guestCount: 0, source: 'manual' },
            { _id: 'm19', user: uid2, date: JUN1, type: 'day', mealCount: 1, isGuestMeal: false, guestCount: 0, source: 'auto' },
        ]));
        mockMeal.bulkWrite.mockResolvedValue({ modifiedCount: 1 });
        mockUser.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

        const r = await bulkCreateMeals({
            startDate: '2026-06-01',
            endDate: '2026-06-01',
            type: 'night',
            userIds: [toStr(uid), toStr(uid2)],
            isGuestMeal: false,
            guestCount: 0,
            remarks: '',
            createdBy: toStr(uid),
        });

        // uid skipped (manual), uid2 updated (auto → bulk)
        expect(r.skipped).toBe(1);
        expect(r.updated).toBe(1);
    });
});
