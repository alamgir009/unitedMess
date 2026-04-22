import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import membersService from '../services/members.service';

const initialState = {
    users: [],
    pagination: {
        totalDocs: 0,
        limit: 10,
        totalPages: 0,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null
    },
    // ── Billing-month stats (current month totals from Meal/Market collections) ──
    billingStats: {
        grandTotalMeal: 0,
        grandTotalMarket: 0,
        mealCharge: 0,
        billingMonth: '',
        month: null,
        year: null,
    },
    billingStatsLoading: false,
    // ── Admin unpaid invoices panel ──
    unpaidInvoices: [],
    unpaidInvoicesLoading: false,
    // ── Generic flags ──
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
};

// ── Fetch all users ──────────────────────────────────────────────────────────
export const fetchUsers = createAsyncThunk(
    'members/fetchUsers',
    async (params, thunkAPI) => {
        try {
            return await membersService.getUsers(params);
        } catch (error) {
            const message =
                (error.response?.data?.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// ── Search users ─────────────────────────────────────────────────────────────
export const searchUsers = createAsyncThunk(
    'members/searchUsers',
    async (params, thunkAPI) => {
        try {
            return await membersService.searchUsers(params);
        } catch (error) {
            const message =
                (error.response?.data?.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// ── Approve / Deny ───────────────────────────────────────────────────────────
export const approveUser = createAsyncThunk(
    'members/approveUser',
    async (userId, thunkAPI) => {
        try {
            return await membersService.approveUser(userId);
        } catch (error) {
            const message = (error.response?.data?.message) || error.message;
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const denyUser = createAsyncThunk(
    'members/denyUser',
    async (userId, thunkAPI) => {
        try {
            return await membersService.denyUser(userId);
        } catch (error) {
            const message = (error.response?.data?.message) || error.message;
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// ── Payment / Gas-bill status ────────────────────────────────────────────────
export const updatePaymentStatus = createAsyncThunk(
    'members/updatePaymentStatus',
    async ({ userId, paymentData }, thunkAPI) => {
        try {
            return await membersService.updatePaymentStatus(userId, paymentData);
        } catch (error) {
            const message = (error.response?.data?.message) || error.message;
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const updateGasBillStatus = createAsyncThunk(
    'members/updateGasBillStatus',
    async ({ userId, gasBillData }, thunkAPI) => {
        try {
            return await membersService.updateGasBillStatus(userId, gasBillData);
        } catch (error) {
            const message = (error.response?.data?.message) || error.message;
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// ── Billing-month stats (correct current-month totals) ───────────────────────
export const fetchBillingMonthStats = createAsyncThunk(
    'members/fetchBillingMonthStats',
    async (_, thunkAPI) => {
        try {
            const response = await membersService.getBillingMonthStats();
            return response?.data ?? response;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message;
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// ── Admin: unpaid / partially-paid finalized invoices ────────────────────────
export const fetchAdminUnpaidInvoices = createAsyncThunk(
    'members/fetchAdminUnpaidInvoices',
    async ({ month, year } = {}, thunkAPI) => {
        try {
            const response = await membersService.getAdminUnpaidInvoices(month, year);
            return response?.data ?? response;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message;
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// ── Admin: update a specific invoice's paid amount ───────────────────────────
export const resolveInvoicePayment = createAsyncThunk(
    'members/resolveInvoicePayment',
    async ({ invoiceId, paidAmount }, thunkAPI) => {
        try {
            const response = await membersService.updateInvoicePayment(invoiceId, paidAmount);
            return response?.data ?? response;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message;
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// ── Slice ────────────────────────────────────────────────────────────────────
export const membersSlice = createSlice({
    name: 'members',
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
            // ── fetchUsers ──────────────────────────────────────────────────
            .addCase(fetchUsers.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const responseData = action.payload?.data || action.payload || {};
                state.users = responseData.users || responseData.docs || (Array.isArray(responseData) ? responseData : []);
                state.pagination = responseData.pagination || state.pagination;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // ── searchUsers ─────────────────────────────────────────────────
            .addCase(searchUsers.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
            })
            .addCase(searchUsers.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const responseData = action.payload?.data || action.payload || {};
                state.users = responseData.users || responseData.docs || (Array.isArray(responseData) ? responseData : []);
                state.pagination = responseData.pagination || state.pagination;
            })
            .addCase(searchUsers.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // ── fetchBillingMonthStats ───────────────────────────────────────
            .addCase(fetchBillingMonthStats.pending, (state) => {
                state.billingStatsLoading = true;
            })
            .addCase(fetchBillingMonthStats.fulfilled, (state, action) => {
                state.billingStatsLoading = false;
                const d = action.payload || {};
                state.billingStats = {
                    grandTotalMeal:   d.grandTotalMeal   ?? 0,
                    grandTotalMarket: d.grandTotalMarket ?? 0,
                    mealCharge:       d.mealCharge       ?? 0,
                    billingMonth:     d.billingMonth     ?? '',
                    month:            d.month            ?? null,
                    year:             d.year             ?? null,
                };
            })
            .addCase(fetchBillingMonthStats.rejected, (state) => {
                state.billingStatsLoading = false;
            })
            // ── fetchAdminUnpaidInvoices ─────────────────────────────────────
            .addCase(fetchAdminUnpaidInvoices.pending, (state) => {
                state.unpaidInvoicesLoading = true;
            })
            .addCase(fetchAdminUnpaidInvoices.fulfilled, (state, action) => {
                state.unpaidInvoicesLoading = false;
                state.unpaidInvoices = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(fetchAdminUnpaidInvoices.rejected, (state) => {
                state.unpaidInvoicesLoading = false;
                state.unpaidInvoices = [];
            })
            // ── resolveInvoicePayment ────────────────────────────────────────
            .addCase(resolveInvoicePayment.fulfilled, (state, action) => {
                const updated = action.payload;
                if (updated?._id) {
                    state.unpaidInvoices = state.unpaidInvoices
                        .map(inv => inv._id === updated._id ? { ...inv, ...updated } : inv)
                        .filter(inv => inv.status !== 'paid');
                }
            });
    },
});

export const { reset } = membersSlice.actions;
export default membersSlice.reducer;
