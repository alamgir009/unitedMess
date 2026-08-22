/**
 * Unit tests for the Market Schedule Service.
 */

const mongoose = require('mongoose');

function mockChain(resolvedValue) {
    const q = {};
    q.lean = jest.fn().mockResolvedValue(resolvedValue);
    q.sort = jest.fn().mockReturnValue(q);
    q.select = jest.fn().mockReturnValue(q);
    q.populate = jest.fn().mockReturnValue(q);
    return q;
}

const mockMarketSchedule = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    insertMany: jest.fn(),
    updateMany: jest.fn(),
};

const mockUser = {
    findById: jest.fn(),
    find: jest.fn(),
};

jest.mock('../../src/models/MarketSchedule.model', () => mockMarketSchedule);
jest.mock('../../src/models/User.model', () => mockUser);
jest.mock('../../src/utils/errors/AppError', () => {
    return jest.fn().mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        return error;
    });
});
jest.mock('../../src/services/googleCalendar.service', () => ({
    syncDatesToCalendar: jest.fn().mockResolvedValue([]),
    removeEventFromCalendar: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('../../src/utils/ics', () => ({
    generateMarketDutyICS: jest.fn().mockReturnValue(Buffer.from('BEGIN:VCALENDAR')),
}));
jest.mock('../../src/services/email.service', () => ({
    sendMarketScheduleConfirmationEmail: jest.fn().mockResolvedValue(true),
    sendMarketScheduleAdminNotificationEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../src/services/notification.service', () => ({
    createAndSend: jest.fn().mockResolvedValue({ _id: 'notif1' }),
    sendToAdmins: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../src/utils/logger/index', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

const marketScheduleService = require('../../src/services/marketSchedule.service');
const MarketSchedule = require('../../src/models/MarketSchedule.model');
const User = require('../../src/models/User.model');
const emailService = require('../../src/services/email.service');
const notificationService = require('../../src/services/notification.service');
const { generateMarketDutyICS } = require('../../src/utils/ics');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('toMonthKey', () => {
    it('generates correct monthKey for single-digit month', () => {
        expect(marketScheduleService.toMonthKey(2026, 8)).toBe('2026-08');
    });

    it('generates correct monthKey for double-digit month', () => {
        expect(marketScheduleService.toMonthKey(2026, 12)).toBe('2026-12');
    });

    it('generates correct monthKey for January', () => {
        expect(marketScheduleService.toMonthKey(2027, 1)).toBe('2027-01');
    });
});

describe('getMonthSchedule', () => {
    it('throws on invalid year', async () => {
        await expect(marketScheduleService.getMonthSchedule('abc', 8))
            .rejects.toThrow('Invalid year or month');
    });

    it('throws on invalid month', async () => {
        await expect(marketScheduleService.getMonthSchedule(2026, 13))
            .rejects.toThrow('Invalid year or month');
    });

    it('returns empty array when no schedules', async () => {
        mockMarketSchedule.find.mockReturnValue(mockChain([]));

        const result = await marketScheduleService.getMonthSchedule(2026, 8);
        expect(result).toEqual([]);
    });

    it('filters by status: active', async () => {
        mockMarketSchedule.find.mockReturnValue(mockChain([]));

        await marketScheduleService.getMonthSchedule(2026, 8);

        expect(mockMarketSchedule.find).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'active' })
        );
    });

    it('returns only DB records (manual selections)', async () => {
        const dbSchedules = [
            { date: new Date('2026-09-05T00:00:00.000Z'), user: { _id: 'u1', name: 'Alice' } },
            { date: new Date('2026-09-12T00:00:00.000Z'), user: { _id: 'u2', name: 'Bob' } },
        ];

        mockMarketSchedule.find.mockReturnValue(mockChain(dbSchedules));

        const result = await marketScheduleService.getMonthSchedule(2026, 9);
        expect(result).toHaveLength(2);
        expect(result).toEqual(dbSchedules);
    });
});

describe('getAvailableDates', () => {
    it('throws on invalid year/month', async () => {
        await expect(marketScheduleService.getAvailableDates('abc', 8))
            .rejects.toThrow('Invalid year or month');
    });

    it('marks taken dates as unavailable', async () => {
        const takenSchedules = [
            { date: new Date('2026-09-05T00:00:00.000Z'), user: { _id: 'u1', name: 'Alice' } },
        ];
        mockMarketSchedule.find.mockReturnValue(mockChain(takenSchedules));

        const result = await marketScheduleService.getAvailableDates(2026, 9);
        const sep5 = result.find((d) => d.date === '2026-09-05');
        expect(sep5).toBeDefined();
        expect(sep5.available).toBe(false);
    });

    it('marks unassigned future dates as available', async () => {
        mockMarketSchedule.find.mockReturnValue(mockChain([]));

        const result = await marketScheduleService.getAvailableDates(2026, 9);
        const sep15 = result.find((d) => d.date === '2026-09-15');
        expect(sep15).toBeDefined();
        expect(sep15.available).toBe(true);
        expect(sep15.takenBy).toBeNull();
    });

    it('filters by status: active', async () => {
        mockMarketSchedule.find.mockReturnValue(mockChain([]));

        await marketScheduleService.getAvailableDates(2026, 9);

        expect(mockMarketSchedule.find).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'active' })
        );
    });
});

describe('getMyScheduledDates', () => {
    it('throws on invalid year/month', async () => {
        await expect(marketScheduleService.getMyScheduledDates('uid', 'abc', 8))
            .rejects.toThrow('Invalid year or month');
    });

    it('returns user schedules filtered by monthKey and status', async () => {
        const userSchedules = [
            { date: new Date('2026-09-05T00:00:00.000Z'), user: 'uid' },
        ];
        mockMarketSchedule.find.mockReturnValue(mockChain(userSchedules));

        const result = await marketScheduleService.getMyScheduledDates('uid', 2026, 9);
        expect(result).toEqual(userSchedules);

        expect(mockMarketSchedule.find).toHaveBeenCalledWith(
            expect.objectContaining({
                user: 'uid',
                monthKey: '2026-09',
                status: 'active',
            })
        );
    });
});

describe('selectDates', () => {
    const userId = new mongoose.Types.ObjectId();
    const year = 2026;
    const month = 9;

    const mockInsertedDoc = (dateStr) => ({
        _id: new mongoose.Types.ObjectId(),
        date: new Date(dateStr),
        user: userId,
        month: 9,
        year: 2026,
        monthKey: '2026-09',
        source: 'user',
        status: 'active',
    });

    const setupForInsert = (user = {}, admins = []) => {
        const defaultUser = {
            _id: userId,
            name: 'Test User',
            email: 'test@example.com',
            googleCalendarSyncEnabled: false,
            notificationPreferences: null,
            ...user,
        };
        mockMarketSchedule.find.mockReset();
        mockMarketSchedule.find
            .mockReturnValueOnce(mockChain([]))
            .mockReturnValueOnce(admins);
        mockUser.findById.mockReset();
        mockUser.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue(defaultUser),
        });
        mockUser.find.mockReset();
        mockUser.find.mockReturnValue(mockChain(admins));
    };

    it('throws on invalid year/month', async () => {
        await expect(marketScheduleService.selectDates(userId, ['2026-09-10'], 'abc', 9))
            .rejects.toThrow('Invalid year or month');
    });

    it('throws on empty dates array', async () => {
        await expect(marketScheduleService.selectDates(userId, [], year, month))
            .rejects.toThrow('At least one date is required');
    });

    it('throws when exceeding max 3 dates per month', async () => {
        mockMarketSchedule.find.mockReturnValue(mockChain([
            { date: new Date('2026-09-01T00:00:00.000Z') },
            { date: new Date('2026-09-02T00:00:00.000Z') },
            { date: new Date('2026-09-03T00:00:00.000Z') },
        ]));

        await expect(marketScheduleService.selectDates(userId, ['2026-09-10'], year, month))
            .rejects.toThrow('Maximum 3');
    });

    it('throws on past dates', async () => {
        mockMarketSchedule.find.mockReturnValue(mockChain([]));

        await expect(marketScheduleService.selectDates(userId, ['2026-08-15'], 2026, 8))
            .rejects.toThrow('Cannot select dates in the past');
    });

    it('skips dates user already has selected', async () => {
        mockMarketSchedule.find.mockReturnValue(mockChain([
            { date: new Date('2026-09-10T00:00:00.000Z'), user: userId },
        ]));
        mockMarketSchedule.insertMany.mockResolvedValue([]);

        const result = await marketScheduleService.selectDates(userId, ['2026-09-10'], year, month);
        expect(result.inserted).toBe(0);
        expect(result.skipped).toBe(1);
    });

    it('inserts new dates and sends confirmation email with .ics', async () => {
        const inserted = [mockInsertedDoc('2026-09-10T00:00:00.000Z')];
        setupForInsert();
        mockMarketSchedule.insertMany.mockResolvedValue(inserted);

        const result = await marketScheduleService.selectDates(userId, ['2026-09-10'], year, month);
        expect(result.inserted).toBe(1);

        await new Promise((r) => setTimeout(r, 50));

        expect(generateMarketDutyICS).toHaveBeenCalledWith(
            expect.objectContaining({ userName: 'Test User' })
        );
        expect(emailService.sendMarketScheduleConfirmationEmail).toHaveBeenCalledWith(
            'test@example.com',
            'Test User',
            inserted,
            expect.any(Buffer)
        );
    });

    it('sends in-app notification to member after insert', async () => {
        const inserted = [mockInsertedDoc('2026-09-10T00:00:00.000Z')];
        setupForInsert();
        mockMarketSchedule.insertMany.mockResolvedValue(inserted);

        await marketScheduleService.selectDates(userId, ['2026-09-10'], year, month);
        await new Promise((r) => setTimeout(r, 50));

        expect(notificationService.createAndSend).toHaveBeenCalledWith(
            userId,
            'SYSTEM',
            'Market Duty Scheduled',
            expect.stringContaining('scheduled market duty'),
            expect.objectContaining({
                priority: 'NORMAL',
                actionUrl: '/events?view=markets',
            })
        );
    });

    it('skips email when notificationPreferences.email is false', async () => {
        const inserted = [mockInsertedDoc('2026-09-10T00:00:00.000Z')];
        setupForInsert({ notificationPreferences: { email: false } });
        mockMarketSchedule.insertMany.mockResolvedValue(inserted);

        await marketScheduleService.selectDates(userId, ['2026-09-10'], year, month);
        await new Promise((r) => setTimeout(r, 50));

        expect(emailService.sendMarketScheduleConfirmationEmail).not.toHaveBeenCalled();
    });

    it('skips email when notificationPreferences.types.SYSTEM is false', async () => {
        const inserted = [mockInsertedDoc('2026-09-10T00:00:00.000Z')];
        setupForInsert({ notificationPreferences: { types: { SYSTEM: false } } });
        mockMarketSchedule.insertMany.mockResolvedValue(inserted);

        await marketScheduleService.selectDates(userId, ['2026-09-10'], year, month);
        await new Promise((r) => setTimeout(r, 50));

        expect(emailService.sendMarketScheduleConfirmationEmail).not.toHaveBeenCalled();
    });

    it('sends in-app notification to admins but no admin email after insert', async () => {
        const inserted = [mockInsertedDoc('2026-09-10T00:00:00.000Z')];
        const adminId = new mongoose.Types.ObjectId();
        setupForInsert({}, [{ _id: adminId, name: 'Admin', email: 'admin@example.com', isActive: true }]);
        mockMarketSchedule.insertMany.mockResolvedValue(inserted);

        await marketScheduleService.selectDates(userId, ['2026-09-10'], year, month);
        await new Promise((r) => setTimeout(r, 50));

        expect(notificationService.createAndSend).toHaveBeenCalledWith(
            adminId,
            'SYSTEM',
            'Market Date Selection',
            expect.stringContaining('Test User'),
            expect.objectContaining({ priority: 'LOW' })
        );
        expect(emailService.sendMarketScheduleAdminNotificationEmail).not.toHaveBeenCalled();
    });

    it('handles duplicate key error (11000) for date conflict', async () => {
        mockMarketSchedule.find.mockReset();
        mockMarketSchedule.find.mockReturnValue(mockChain([]));

        const dupError = new Error('Duplicate key');
        dupError.code = 11000;
        dupError.insertedDocs = [];
        mockMarketSchedule.insertMany.mockRejectedValue(dupError);

        await expect(marketScheduleService.selectDates(userId, ['2026-09-10'], year, month))
            .rejects.toThrow('already taken');
    });

    it('handles partial duplicate key error', async () => {
        const partialDoc = mockInsertedDoc('2026-09-10T00:00:00.000Z');
        setupForInsert();

        const dupError = new Error('Duplicate key');
        dupError.code = 11000;
        dupError.insertedDocs = [partialDoc];
        mockMarketSchedule.insertMany.mockRejectedValue(dupError);

        const result = await marketScheduleService.selectDates(userId, ['2026-09-10', '2026-09-15'], year, month);
        expect(result.inserted).toBe(1);
    });

    it('validates dates are in the correct month', async () => {
        mockMarketSchedule.find.mockReset();
        mockMarketSchedule.find.mockReturnValue(mockChain([]));

        await expect(marketScheduleService.selectDates(userId, ['2026-10-01'], year, month))
            .rejects.toThrow('All dates must be in the specified month and year');
    });
});

describe('removeScheduledDate', () => {
    it('throws when schedule not found', async () => {
        mockMarketSchedule.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

        await expect(marketScheduleService.removeScheduledDate('id1', 'uid1'))
            .rejects.toThrow('not found');
    });

    it('throws when user does not own the schedule', async () => {
        mockMarketSchedule.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue({ user: { toString: () => 'other-user' } }),
        });

        await expect(marketScheduleService.removeScheduledDate('id1', 'uid1'))
            .rejects.toThrow('only remove your own');
    });

    it('soft-deletes schedule (sets status to superseded)', async () => {
        const ownerUserId = new mongoose.Types.ObjectId();
        mockMarketSchedule.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                _id: 'id1',
                user: { toString: () => ownerUserId.toString() },
                googleCalendarEventId: null,
            }),
        });
        mockMarketSchedule.findByIdAndUpdate.mockResolvedValue({});

        const result = await marketScheduleService.removeScheduledDate('id1', ownerUserId);
        expect(result.removed).toBe(true);
        expect(mockMarketSchedule.findByIdAndUpdate).toHaveBeenCalledWith(
            'id1',
            expect.objectContaining({ status: 'superseded' })
        );
    });

    it('does not hard-delete (findByIdAndDelete not called)', async () => {
        const ownerUserId = new mongoose.Types.ObjectId();
        mockMarketSchedule.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                _id: 'id1',
                user: { toString: () => ownerUserId.toString() },
                googleCalendarEventId: null,
            }),
        });
        mockMarketSchedule.findByIdAndUpdate.mockResolvedValue({});

        await marketScheduleService.removeScheduledDate('id1', ownerUserId);
        expect(mockMarketSchedule.findByIdAndUpdate).toHaveBeenCalled();
        expect(mockMarketSchedule.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('removes Google Calendar event when present', async () => {
        const ownerUserId = new mongoose.Types.ObjectId();
        mockMarketSchedule.findById.mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                _id: 'id1',
                user: { toString: () => ownerUserId.toString() },
                googleCalendarEventId: 'gcal-event-123',
            }),
        });
        mockMarketSchedule.findByIdAndUpdate.mockResolvedValue({});

        const googleCalendarService = require('../../src/services/googleCalendar.service');
        await marketScheduleService.removeScheduledDate('id1', ownerUserId);
        expect(googleCalendarService.removeEventFromCalendar).toHaveBeenCalledWith(ownerUserId, 'gcal-event-123');
    });
});
