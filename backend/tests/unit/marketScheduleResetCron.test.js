/**
 * Unit tests for the Market Schedule Reset Cron.
 */

function mockChain(resolvedValue) {
    const q = {};
    q.lean = jest.fn().mockResolvedValue(resolvedValue);
    q.sort = jest.fn().mockReturnValue(q);
    q.select = jest.fn().mockReturnValue(q);
    q.populate = jest.fn().mockReturnValue(q);
    return q;
}

const mockFind = jest.fn();
const mockUpdateMany = jest.fn();

jest.mock('../../src/models/MarketSchedule.model', () => ({
    find: (...args) => mockFind(...args),
    updateMany: (...args) => mockUpdateMany(...args),
}));

jest.mock('../../src/services/googleCalendar.service', () => ({
    removeEventFromCalendar: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../src/utils/logger/index', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

const { resetMonthEnd, resetFirstOfMonth } = require('../../src/jobs/cron/marketScheduleResetCron');
const googleCalendarService = require('../../src/services/googleCalendar.service');

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('resetMonthEnd', () => {
    it('resets current month records on the last day of the month', async () => {
        jest.setSystemTime(new Date(Date.UTC(2026, 8, 30, 18, 29, 0)));

        const records = [
            { _id: 'r1', googleCalendarEventId: null, user: 'u1' },
            { _id: 'r2', googleCalendarEventId: 'gcal-123', user: 'u2' },
        ];
        mockFind.mockReturnValue(mockChain(records));
        mockUpdateMany.mockResolvedValue({ modifiedCount: 2 });

        await resetMonthEnd();

        expect(mockFind).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'active', year: 2026, month: 9 })
        );
        expect(mockUpdateMany).toHaveBeenCalledWith(
            { _id: { $in: ['r1', 'r2'] } },
            { $set: { status: 'reset' } }
        );
        expect(googleCalendarService.removeEventFromCalendar).toHaveBeenCalledWith('u2', 'gcal-123');
    });

    it('does not reset on non-last day of the month', async () => {
        jest.setSystemTime(new Date(Date.UTC(2026, 8, 15, 12, 0, 0)));

        await resetMonthEnd();

        expect(mockFind).not.toHaveBeenCalled();
        expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('does nothing when no records to reset', async () => {
        jest.setSystemTime(new Date(Date.UTC(2026, 8, 30, 18, 29, 0)));

        mockFind.mockReturnValue(mockChain([]));

        await resetMonthEnd();

        expect(mockFind).toHaveBeenCalled();
        expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('only resets current month (not future months)', async () => {
        jest.setSystemTime(new Date(Date.UTC(2026, 8, 30, 18, 29, 0)));

        mockFind.mockReturnValue(mockChain([
            { _id: 'sep1', googleCalendarEventId: null, user: 'u1' },
        ]));
        mockUpdateMany.mockResolvedValue({ modifiedCount: 1 });

        await resetMonthEnd();

        const findQuery = mockFind.mock.calls[0][0];
        expect(findQuery).toEqual({ status: 'active', year: 2026, month: 9 });
        expect(findQuery.$or).toBeUndefined();
    });

    it('skips GC cleanup when no googleCalendarEventId', async () => {
        jest.setSystemTime(new Date(Date.UTC(2026, 8, 30, 18, 29, 0)));

        mockFind.mockReturnValue(mockChain([
            { _id: 'r1', googleCalendarEventId: null, user: 'u1' },
        ]));
        mockUpdateMany.mockResolvedValue({ modifiedCount: 1 });

        await resetMonthEnd();

        expect(googleCalendarService.removeEventFromCalendar).not.toHaveBeenCalled();
    });

    it('handles GC cleanup failure gracefully', async () => {
        jest.setSystemTime(new Date(Date.UTC(2026, 8, 30, 18, 29, 0)));

        mockFind.mockReturnValue(mockChain([
            { _id: 'r1', googleCalendarEventId: 'gcal-fail', user: 'u1' },
        ]));
        mockUpdateMany.mockResolvedValue({ modifiedCount: 1 });
        googleCalendarService.removeEventFromCalendar.mockRejectedValueOnce(new Error('GC API down'));

        await resetMonthEnd();

        expect(mockUpdateMany).toHaveBeenCalled();
    });
});

describe('resetFirstOfMonth', () => {
    it('resets previous month records on the 1st of the month', async () => {
        // Oct 1 00:00 UTC → utcDay=1, utcMonth=10 (Oct), prev month=9 (Sep)
        jest.setSystemTime(new Date(Date.UTC(2026, 9, 1, 0, 0, 0)));

        mockFind.mockReturnValue(mockChain([
            { _id: 'sep-r1', googleCalendarEventId: null, user: 'u1' },
        ]));
        mockUpdateMany.mockResolvedValue({ modifiedCount: 1 });

        await resetFirstOfMonth();

        expect(mockFind).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'active', year: 2026, month: 9 })
        );
        expect(mockUpdateMany).toHaveBeenCalled();
    });

    it('does not reset on non-1st day of the month', async () => {
        jest.setSystemTime(new Date(Date.UTC(2026, 9, 15, 12, 0, 0)));

        await resetFirstOfMonth();

        expect(mockFind).not.toHaveBeenCalled();
        expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('does nothing when no records to reset', async () => {
        jest.setSystemTime(new Date(Date.UTC(2026, 9, 1, 0, 0, 0)));

        mockFind.mockReturnValue(mockChain([]));

        await resetFirstOfMonth();

        expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('only resets previous month (not current or future)', async () => {
        jest.setSystemTime(new Date(Date.UTC(2026, 9, 1, 0, 0, 0)));

        mockFind.mockReturnValue(mockChain([
            { _id: 'sep1', googleCalendarEventId: null, user: 'u1' },
        ]));
        mockUpdateMany.mockResolvedValue({ modifiedCount: 1 });

        await resetFirstOfMonth();

        const findQuery = mockFind.mock.calls[0][0];
        expect(findQuery).toEqual({ status: 'active', year: 2026, month: 9 });
        expect(findQuery.$or).toBeUndefined();
    });

    it('handles year boundary (January 1st resets December)', async () => {
        // Jan 1, 2027 00:00 UTC → utcDay=1, utcMonth=1 (Jan), prev month=12 (Dec) of 2026
        jest.setSystemTime(new Date(Date.UTC(2027, 0, 1, 0, 0, 0)));

        mockFind.mockReturnValue(mockChain([
            { _id: 'dec-r1', googleCalendarEventId: null, user: 'u1' },
        ]));
        mockUpdateMany.mockResolvedValue({ modifiedCount: 1 });

        await resetFirstOfMonth();

        const findQuery = mockFind.mock.calls[0][0];
        expect(findQuery).toEqual({ status: 'active', year: 2026, month: 12 });
    });
});
