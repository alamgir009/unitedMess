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
        grandTotalGuest: 0,
        grandTotalMarket: 0,
        totalOwnMeals: 0,
        guestMealRate: 0,
        mealCharge: 0,
        billingMonth: '',
        month: null,
        year: null,
    },
    billingStatsLoading: false,
    // ── Admin unpaid invoices panel ──
    unpaidInvoices: [],
    unpaidInvoicesLoading: false,
    unpaidInvoicesError: null,
    // "YYYY-MonthName" of the in-flight/latest unpaid-invoices request —
    // used to drop stale responses for a different month.
    unpaidInvoicesRequestKey: null,
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
        // searchUsers is admin-only on the backend (authorize('admin')).
        // Reject early to prevent a 403 from reaching the UI.
        const state = thunkAPI.getState();
        if (state.auth.user?.role !== 'admin') {
            return thunkAPI.rejectWithValue('Search is restricted to administrators');
        }
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

// ── Admin: unpaid / partially-paid invoices (any finalization status) ────────
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

// ── Admin: update a specific invoice's paid amount (or process a refund) ─────
export const resolveInvoicePayment = createAsyncThunk(
    'members/resolveInvoicePayment',
    async ({ invoiceId, paidAmount, delta }, thunkAPI) => {
        try {
            const response = await membersService.updateInvoicePayment(invoiceId, paidAmount, delta);
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
                    grandTotalGuest:  d.grandTotalGuest  ?? 0,
                    grandTotalMarket: d.grandTotalMarket ?? 0,
                    totalOwnMeals:    d.totalOwnMeals    ?? 0,
                    guestMealRate:    d.guestMealRate    ?? 0,
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
            .addCase(fetchAdminUnpaidInvoices.pending, (state, action) => {
                state.unpaidInvoicesLoading = true;
                state.unpaidInvoicesError = null;
                // Remember which month this request is for — a stale response
                // (e.g. last-finalized period raced against a user-selected
                // older month) must never clobber the panel's current view.
                const { month, year } = action.meta.arg || {};
                state.unpaidInvoicesRequestKey = (month && year) ? `${year}-${month}` : null;
            })
            .addCase(fetchAdminUnpaidInvoices.fulfilled, (state, action) => {
                const { month, year } = action.meta.arg || {};
                const key = (month && year) ? `${year}-${month}` : null;
                if (state.unpaidInvoicesRequestKey && key && state.unpaidInvoicesRequestKey !== key) {
                    return; // stale response for a different month — drop it
                }
                state.unpaidInvoicesLoading = false;
                state.unpaidInvoicesError = null;
                state.unpaidInvoices = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(fetchAdminUnpaidInvoices.rejected, (state, action) => {
                const { month, year } = action.meta.arg || {};
                const key = (month && year) ? `${year}-${month}` : null;
                if (state.unpaidInvoicesRequestKey && key && state.unpaidInvoicesRequestKey !== key) {
                    return; // stale rejection — don't touch newer month's state
                }
                state.unpaidInvoicesLoading = false;
                // Preserve existing data on error — the panel shows a retry UI.
                state.unpaidInvoicesError = action.payload || 'Failed to load unresolved invoices';
            })
            // ── resolveInvoicePayment ────────────────────────────────────────
            .addCase(resolveInvoicePayment.fulfilled, (state, action) => {
                const updated = action.payload;
                if (!updated?._id) return;
                // The controller returns the invoice annotated with
                // refundCredit/refundRemaining. Merge it in; the moment it is
                // no longer actionable (refund fully recorded, or debt paid
                // off) REMOVE it — a resolved bill must clear from the
                // Unresolved Bills panel immediately. The panel also
                // refetches its selected month after every resolve.
                state.unpaidInvoices = state.unpaidInvoices.flatMap(inv => {
                    if (inv._id !== updated._id) return [inv];
                    const merged = { ...inv, ...updated };
                    // Controller returns `user` as a bare ObjectId — keep the
                    // populated copy from the original list row.
                    if (!merged.user?.name && !merged.user?.email && inv.user) {
                        merged.user = inv.user;
                    }
                    const credit = Number(merged.refundCredit) || 0;
                    const remaining = Number(merged.refundRemaining ?? credit);
                    const outstanding = (Number(merged.totalPayable) || 0) - (Number(merged.paidAmount) || 0);
                    const stillActionable = credit > 0 ? remaining > 0 : outstanding > 0;
                    return stillActionable ? [merged] : [];
                });
            });
    },
});

export const { reset } = membersSlice.actions;
export default membersSlice.reducer;
