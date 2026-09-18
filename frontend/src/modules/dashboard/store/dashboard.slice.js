import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dashboardService from '../services/dashboard.service';
import { logout } from '@/modules/auth/store/auth.slice';

const initialState = {
    adminStats: null,
    marketGrandTotal: null,
    mealGrandTotal: null,
    mealCharge: null,
    userMealPayable: null,
    userGasBillPayable: null,
    recentActivities: [],
    isError: false,
    isSuccess: false,
    isLoading: false,
    isActivitiesLoading: false,
    // ── Per-section error/loaded flags (user stats) ──────────────────────────
    // userStatsLoaded: false means data has never been fetched yet.
    // Components must NOT infer "paid" from null values until this is true.
    userStatsLoaded: false,
    isUserStatsError: false,
    isMealPayableError: false,
    isGasBillPayableError: false,
    lastFetchedAt: null,
    message: '',
};

export const fetchAdminDashboardStats = createAsyncThunk(
    'dashboard/fetchAdminStats',
    async (_, thunkAPI) => {
        try {
            const stats = await dashboardService.getAdminStats();
            const marketTotal = await dashboardService.getMarketGrandTotal();
            const mealTotal = await dashboardService.getMealGrandTotal();
            const mealCharge = await dashboardService.getMealCharge();

            return {
                stats: stats?.data || stats,
                marketTotal: marketTotal?.data || marketTotal,
                mealTotal: mealTotal?.data || mealTotal,
                mealCharge: mealCharge?.data || mealCharge,
            };
        } catch (error) {
            const message =
                (error.response &&
                    error.response.data &&
                    error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const fetchUserDashboardStats = createAsyncThunk(
    'dashboard/fetchUserStats',
    async () => {
        const [mealResult, gasResult] = await Promise.allSettled([
            dashboardService.getUserMealPayable(),
            dashboardService.getUserGasBillPayable(),
        ]);

        const extractData = (result) => {
            if (result.status !== 'fulfilled') return null;
            const payload = result.value;
            return payload?.data ?? payload ?? null;
        };

        return {
            mealPayable: extractData(mealResult),
            gasBillPayable: extractData(gasResult),
            isMealPayableError: mealResult.status === 'rejected',
            isGasBillPayableError: gasResult.status === 'rejected',
        };
    }
);

export const fetchUserRecentActivity = createAsyncThunk(
    'dashboard/fetchRecentActivity',
    async (_, thunkAPI) => {
        try {
            return await dashboardService.getUserRecentActivity();
        } catch (error) {
            const message =
                (error.response &&
                    error.response.data &&
                    error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        reset: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
        },
    },
    extraReducers: (builder) => {
        builder
            // Admin Stats
            .addCase(fetchAdminDashboardStats.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
            })
            .addCase(fetchAdminDashboardStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.adminStats = action.payload.stats;
                state.marketGrandTotal = action.payload.marketTotal;
                state.mealGrandTotal = action.payload.mealTotal;
                state.mealCharge = action.payload.mealCharge;
            })
            .addCase(fetchAdminDashboardStats.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // User Stats
            .addCase(fetchUserDashboardStats.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isUserStatsError = false;
                state.isMealPayableError = false;
                state.isGasBillPayableError = false;
                state.isSuccess = false;
            })
            .addCase(fetchUserDashboardStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.userStatsLoaded = true;
                state.lastFetchedAt = Date.now();
                state.userMealPayable = action.payload.mealPayable;
                state.userGasBillPayable = action.payload.gasBillPayable;
                state.isMealPayableError = action.payload.isMealPayableError;
                state.isGasBillPayableError = action.payload.isGasBillPayableError;
                state.isUserStatsError =
                    action.payload.isMealPayableError && action.payload.isGasBillPayableError;
            })
            .addCase(fetchUserDashboardStats.rejected, (state) => {
                state.isLoading = false;
                state.isError = true;
                state.isUserStatsError = true;
                state.isMealPayableError = true;
                state.isGasBillPayableError = true;
                state.userStatsLoaded = true;
                state.lastFetchedAt = Date.now();
            })
            // Recent Activity
            .addCase(fetchUserRecentActivity.pending, (state) => {
                state.isActivitiesLoading = true;
            })
            .addCase(fetchUserRecentActivity.fulfilled, (state, action) => {
                state.isActivitiesLoading = false;
                state.recentActivities = action.payload || [];
                state.lastFetchedAt = Date.now();
            })
            .addCase(fetchUserRecentActivity.rejected, (state) => {
                state.isActivitiesLoading = false;
                state.recentActivities = [];
                state.lastFetchedAt = Date.now();
            })
            // ── logout: clear all dashboard state ──────────────────────────
            .addCase(logout.fulfilled, (state) => {
                state.adminStats = null;
                state.marketGrandTotal = null;
                state.mealGrandTotal = null;
                state.mealCharge = null;
                state.userMealPayable = null;
                state.userGasBillPayable = null;
                state.recentActivities = [];
                state.userStatsLoaded = false;
                state.isMealPayableError = false;
                state.isGasBillPayableError = false;
                state.lastFetchedAt = null;
            });
    },
});

export const { reset } = dashboardSlice.actions;
export default dashboardSlice.reducer;
