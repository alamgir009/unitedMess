/**
 * invoice.slice.js
 *
 * Dedicated Redux slice for the invoice module.
 * Keeps invoice state completely isolated from payment.slice.js.
 *
 * State shape:
 *  - activeInvoice     : Invoice | null   — current live/active invoice (10th-day rule)
 *  - invoiceHistory    : Invoice[]        — all past invoices, newest-first
 *  - monthlyInvoice    : Invoice | null   — invoice currently shown in the "View Invoice" modal
 *
 *  - isLoadingActive   : bool
 *  - isLoadingHistory  : bool
 *  - isLoadingMonthly  : bool
 *  - error             : string | null
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import invoiceService from '../services/invoice.service';

// ─────────────────────────────────────────────────────────────
// Thunks
// ─────────────────────────────────────────────────────────────

/**
 * Fetches the active invoice for the current user based on the 10th-day rule.
 */
export const fetchActiveInvoice = createAsyncThunk(
    'invoice/fetchActive',
    async (_, thunkAPI) => {
        try {
            const res = await invoiceService.getActiveInvoice();
            return res?.data ?? res;
        } catch (err) {
            const msg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                'Failed to fetch active invoice';
            return thunkAPI.rejectWithValue(msg);
        }
    }
);

/**
 * Fetches the full invoice history for the current user.
 */
export const fetchInvoiceHistory = createAsyncThunk(
    'invoice/fetchHistory',
    async (_, thunkAPI) => {
        try {
            const res = await invoiceService.getInvoiceHistory();
            return res?.data ?? res;
        } catch (err) {
            const msg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                'Failed to fetch invoice history';
            return thunkAPI.rejectWithValue(msg);
        }
    }
);

/**
 * Fetches the invoice for a specific month/year.
 * Used by the MonthlyInvoiceModal when user clicks "View Invoice" on a payment.
 *
 * @param {{ year: number, month: number }} params
 */
export const fetchMonthlyInvoice = createAsyncThunk(
    'invoice/fetchMonthly',
    async ({ year, month }, thunkAPI) => {
        try {
            const res = await invoiceService.getInvoiceForMonth(year, month);
            return res?.data ?? res;
        } catch (err) {
            const msg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                'Failed to fetch invoice';
            return thunkAPI.rejectWithValue(msg);
        }
    }
);

// ─────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────

const initialState = {
    activeInvoice:    null,
    invoiceHistory:   [],
    monthlyInvoice:   null,

    isLoadingActive:  false,
    isLoadingHistory: false,
    isLoadingMonthly: false,

    error: null,
};

export const invoiceSlice = createSlice({
    name: 'invoice',
    initialState,
    reducers: {
        /** Clear the modal invoice when the modal closes — avoids stale data flash. */
        clearMonthlyInvoice: (state) => {
            state.monthlyInvoice  = null;
            state.isLoadingMonthly = false;
            state.error           = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // ── fetchActiveInvoice ───────────────────────────────
            .addCase(fetchActiveInvoice.pending, (state) => {
                state.isLoadingActive = true;
                state.error = null;
            })
            .addCase(fetchActiveInvoice.fulfilled, (state, action) => {
                state.isLoadingActive = false;
                state.activeInvoice   = action.payload;
            })
            .addCase(fetchActiveInvoice.rejected, (state, action) => {
                state.isLoadingActive = false;
                state.error           = action.payload;
            })

            // ── fetchInvoiceHistory ──────────────────────────────
            .addCase(fetchInvoiceHistory.pending, (state) => {
                state.isLoadingHistory = true;
                state.error = null;
            })
            .addCase(fetchInvoiceHistory.fulfilled, (state, action) => {
                state.isLoadingHistory = false;
                state.invoiceHistory   = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(fetchInvoiceHistory.rejected, (state, action) => {
                state.isLoadingHistory = false;
                state.error            = action.payload;
            })

            // ── fetchMonthlyInvoice ──────────────────────────────
            .addCase(fetchMonthlyInvoice.pending, (state) => {
                state.isLoadingMonthly = true;
                state.monthlyInvoice   = null;
                state.error            = null;
            })
            .addCase(fetchMonthlyInvoice.fulfilled, (state, action) => {
                state.isLoadingMonthly = false;
                state.monthlyInvoice   = action.payload;
            })
            .addCase(fetchMonthlyInvoice.rejected, (state, action) => {
                state.isLoadingMonthly = false;
                state.error            = action.payload;
            });
    },
});

export const { clearMonthlyInvoice, clearError } = invoiceSlice.actions;
export default invoiceSlice.reducer;
