import { configureStore, createSlice } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyticsApi } from '@/modules/analytics/store/analytics.api';
import analyticsUi, { selectMember, selectMonth, selectReport, reportingWindowChanged, analyticsDataChanged } from '@/modules/analytics/store/analytics.slice';
import { analyticsMiddleware } from '@/modules/analytics/store/analytics.middleware';
import { getReport, getMembers } from '@/modules/analytics/services/analytics.service';
import { getISTWindowKey } from '@/modules/analytics/hooks/useAnalyticsSession';

vi.mock('@/modules/analytics/services/analytics.service', () => ({ getReport: vi.fn(), getMembers: vi.fn() }));
const admin = { _id: 'admin-a', role: 'admin', userStatus: 'approved', isActive: true };
const auth = createSlice({ name: 'auth', initialState: { user: admin }, reducers: { setUser: (state, { payload }) => { state.user = payload; } } });
const args = { viewerId: admin._id, epoch: 0, windowKey: '2026-11', report: 'market', memberId: '' };
let store;
beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-16T10:00:00Z')); vi.clearAllMocks();
    getReport.mockResolvedValue({ monthly: [{ amount: '70.30' }] }); getMembers.mockResolvedValue([]);
    store = configureStore({ reducer: { auth: auth.reducer, analyticsUi, [analyticsApi.reducerPath]: analyticsApi.reducer }, middleware: (defaults) => defaults().concat(analyticsMiddleware, analyticsApi.middleware) });
});
afterEach(() => { store.dispatch({ type: 'auth/logout/pending' }); vi.clearAllTimers(); vi.useRealTimers(); });
const load = (options = {}, key = args) => store.dispatch(analyticsApi.endpoints.getAnalyticsReport.initiate(key, options));
const flushInvalidation = async () => { await vi.advanceTimersByTimeAsync(200); };

describe('Analytics session cache', () => {
    it('deduplicates pending requests, serves fresh return visits, and retains cached content during stale/forced refresh', async () => {
        let resolve;
        getReport.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
        const first = load(); const second = load();
        expect(getReport).toHaveBeenCalledTimes(1);
        resolve({ monthly: [{ amount: '70.30' }] }); await first; await second;
        first.unsubscribe(); second.unsubscribe();
        const fresh = load({ forceRefetch: 60 }); await fresh;
        expect(getReport).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(61000);
        getReport.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
        const stale = load({ forceRefetch: 60 });
        expect(getReport).toHaveBeenCalledTimes(2);
        expect(analyticsApi.endpoints.getAnalyticsReport.select(args)(store.getState()).data.monthly[0].amount).toBe('70.30');
        resolve({ monthly: [{ amount: '80.00' }] }); await stale;
        await load({ forceRefetch: true }); expect(getReport).toHaveBeenCalledTimes(3);
    });
    it('preserves filters until session reset and resets only the month on IST rollover', () => {
        store.dispatch(reportingWindowChanged('2026-11'));
        store.dispatch(selectMember({ _id: 'member-b', name: 'Bob' })); store.dispatch(selectReport('meal')); store.dispatch(selectMonth('2026-09'));
        store.dispatch(reportingWindowChanged('2026-11')); expect(store.getState().analyticsUi.selectedMonth).toBe('2026-09');
        expect(getISTWindowKey(new Date('2026-11-30T18:29:59Z'))).toBe('2026-11');
        expect(getISTWindowKey(new Date('2026-11-30T18:30:00Z'))).toBe('2026-12');
        store.dispatch(reportingWindowChanged('2026-12'));
        expect(store.getState().analyticsUi).toMatchObject({ selectedMonth: '', report: 'meal', member: { _id: 'member-b' } });
    });
    it('coalesces market changes across both reports; meal changes affect only meal reports', async () => {
        await load(); await load({}, { ...args, report: 'meal' });
        getReport.mockClear();
        store.dispatch({ type: 'meal/create/fulfilled' }); await flushInvalidation();
        expect(getReport.mock.calls.map((call) => call[0])).toEqual(['meal']);
        getReport.mockClear(); store.dispatch({ type: 'market/bulkCreate/fulfilled' }); store.dispatch(analyticsDataChanged()); await flushInvalidation();
        expect(getReport.mock.calls.map((call) => call[0]).sort()).toEqual(['market', 'meal']);
    });
    it('invalidates member search and reports after membership edits', async () => {
        await load(); await store.dispatch(analyticsApi.endpoints.getAnalyticsMembers.initiate({ viewerId: admin._id, epoch: 0, q: '' }));
        getReport.mockClear(); getMembers.mockClear();
        store.dispatch({ type: 'members/approveUser/fulfilled' }); await flushInvalidation();
        expect(getReport).toHaveBeenCalledTimes(1); expect(getMembers).toHaveBeenCalledTimes(1);
    });
    it('retains successful results on transient errors but clears protected data on 403', async () => {
        await load(); getReport.mockRejectedValueOnce(new Error('offline')); await load({ forceRefetch: true });
        expect(analyticsApi.endpoints.getAnalyticsReport.select(args)(store.getState()).data).toBeDefined();
        getReport.mockRejectedValueOnce({ response: { status: 403, data: { message: 'Permission revoked' } } }); await load({ forceRefetch: true });
        expect(store.getState().analyticsUi.accessError.status).toBe(403);
        expect(Object.keys(store.getState().analyticsApi.queries)).toHaveLength(0);
    });
    it('clears data and aborts requests on logout/account changes; non-admins cannot fetch', async () => {
        await load();
        store.dispatch(auth.actions.setUser({ ...admin, _id: 'admin-b' }));
        expect(Object.keys(store.getState().analyticsApi.queries)).toHaveLength(0);
        expect(store.getState().analyticsUi.epoch).toBe(1);
        store.dispatch(auth.actions.setUser({ ...admin, role: 'user' })); getReport.mockClear();
        await load(); expect(getReport).not.toHaveBeenCalled();
        store.dispatch(auth.actions.setUser(admin));
        let signal;
        getReport.mockImplementationOnce((report, member, requestSignal) => { signal = requestSignal; return new Promise(() => {}); });
        const running = load({}, { ...args, epoch: store.getState().analyticsUi.epoch });
        store.dispatch({ type: 'auth/logout/pending' }); await running;
        expect(signal.aborted).toBe(true); expect(store.getState().analyticsUi.suspended).toBe(true);
    });
});
