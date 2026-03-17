import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dashboardService from '../services/dashboard.service';

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
    async (_, thunkAPI) => {
        try {
            const mealPayable = await dashboardService.getUserMealPayable();
            const gasBillPayable = await dashboardService.getUserGasBillPayable();

            return {
                mealPayable: mealPayable?.data || mealPayable,
                gasBillPayable: gasBillPayable?.data || gasBillPayable,
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
                state.isSuccess = false;
            })
            .addCase(fetchUserDashboardStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.userMealPayable = action.payload.mealPayable;
                state.userGasBillPayable = action.payload.gasBillPayable;
            })
            .addCase(fetchUserDashboardStats.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Recent Activity
            .addCase(fetchUserRecentActivity.pending, (state) => {
                state.isActivitiesLoading = true;
            })
            .addCase(fetchUserRecentActivity.fulfilled, (state, action) => {
                state.isActivitiesLoading = false;
                state.recentActivities = action.payload || [];
            })
            .addCase(fetchUserRecentActivity.rejected, (state) => {
                state.isActivitiesLoading = false;
                state.recentActivities = [];
            });
    },
});

export const { reset } = dashboardSlice.actions;
export default dashboardSlice.reducer;
