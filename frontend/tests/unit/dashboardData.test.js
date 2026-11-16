import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import dashboard, { fetchAdminDashboardStats, fetchUserDashboardStats } from '@/modules/dashboard/store/dashboard.slice';
import service from '@/modules/dashboard/services/dashboard.service';

vi.mock('@/modules/dashboard/services/dashboard.service', () => ({ default: { getAdminStats: vi.fn(), getMarketGrandTotal: vi.fn(), getMealGrandTotal: vi.fn(), getMealCharge: vi.fn(), getUserMealPayable: vi.fn(), getUserGasBillPayable: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
describe('Dashboard loading', () => {
    it('starts all four independent admin requests concurrently and retains loaded values while refreshing', async () => {
        const store = configureStore({ reducer: { dashboard } });
        const methods = ['getAdminStats', 'getMarketGrandTotal', 'getMealGrandTotal', 'getMealCharge'];
        const resolve = [];
        methods.forEach((method, i) => service[method].mockImplementationOnce(() => new Promise((done) => { resolve[i] = done; })));
        const pending = store.dispatch(fetchAdminDashboardStats());
        methods.forEach((method) => expect(service[method]).toHaveBeenCalledTimes(1));
        service.getUserMealPayable.mockResolvedValue({ data: { payableAmount: 0, paymentStatus: 'success' } });
        service.getUserGasBillPayable.mockResolvedValue({ data: { payableAmount: 0, status: 'success' } });
        await store.dispatch(fetchUserDashboardStats());
        expect(store.getState().dashboard).toMatchObject({ isLoading: true, isAdminStatsLoading: true, isUserStatsLoading: false });
        resolve.forEach((done, i) => done({ data: { value: i + 1 } })); await pending;
        expect(store.getState().dashboard.adminStats).toEqual({ value: 1 });
        methods.forEach((method, i) => service[method].mockResolvedValue({ data: { value: i + 2 } }));
        const refresh = store.dispatch(fetchAdminDashboardStats());
        expect(store.getState().dashboard.adminStats).toEqual({ value: 1 });
        await refresh; expect(store.getState().dashboard.adminStats).toEqual({ value: 2 });
    });
    it('keeps partial payment failures distinct from settled or zero balances', async () => {
        const store = configureStore({ reducer: { dashboard } });
        service.getUserMealPayable.mockResolvedValue({ data: { payableAmount: 1453.87, paymentStatus: 'pending' } });
        service.getUserGasBillPayable.mockRejectedValue(new Error('offline'));
        await store.dispatch(fetchUserDashboardStats());
        expect(store.getState().dashboard).toMatchObject({ userStatsLoaded: true, isMealPayableError: false, isGasBillPayableError: true, isUserStatsError: false, userMealPayable: { payableAmount: 1453.87, paymentStatus: 'pending' }, userGasBillPayable: null });
    });
});
