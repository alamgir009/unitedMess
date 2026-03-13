import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import paymentService from '../services/payment.service';

const initialState = {
    payments: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false },
    isLoading: false,
    isSuccess: false,
    isError: false,
    message: '',
};

/* ── Thunks ── */

export const fetchPayments = createAsyncThunk('payment/fetchAll', async (params, thunkAPI) => {
    try {
        // paymentService.getPayments returns response.data (axios body)
        // = { success, message, data: { results, totalResults, totalPages, page, limit } }
        // so res.data here = { results, totalResults, totalPages, page, limit }
        const res = await paymentService.getPayments(params);
        return res.data; // { results, totalResults, totalPages, page, limit }
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response?.data?.error || err.response?.data?.message || err.message);
    }
});

export const createPayment = createAsyncThunk('payment/create', async (paymentData, thunkAPI) => {
    try {
        const res = await paymentService.createPayment(paymentData);
        // res = { success, message, data: <payment> }  →  res.data = <payment>
        return res.data;
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response?.data?.error || err.response?.data?.message || err.message);
    }
});

export const updatePayment = createAsyncThunk('payment/update', async ({ paymentId, paymentData }, thunkAPI) => {
    try {
        const res = await paymentService.updatePayment(paymentId, paymentData);
        return res.data; // <updated payment>
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response?.data?.error || err.response?.data?.message || err.message);
    }
});

export const deletePayment = createAsyncThunk('payment/delete', async (paymentId, thunkAPI) => {
    try {
        await paymentService.deletePayment(paymentId);
        return paymentId;
    } catch (err) {
        return thunkAPI.rejectWithValue(err.response?.data?.error || err.response?.data?.message || err.message);
    }
});

/* ── Slice ── */

export const paymentSlice = createSlice({
    name: 'payment',
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
            // fetchPayments
            .addCase(fetchPayments.pending, (state) => { state.isLoading = true; })
            .addCase(fetchPayments.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Backend queryPayments returns: { results, totalResults, totalPages, page, limit }
                if (action.payload?.results) {
                    state.payments = action.payload.results;
                    state.pagination = {
                        page:    action.payload.page,
                        limit:   action.payload.limit,
                        total:   action.payload.totalResults,
                        pages:   action.payload.totalPages,
                        hasNext: action.payload.page < action.payload.totalPages,
                        hasPrev: action.payload.page > 1,
                    };
                } else {
                    state.payments = Array.isArray(action.payload) ? action.payload : [];
                }
            })
            .addCase(fetchPayments.rejected, (state, action) => { state.isLoading = false; state.isError = true; state.message = action.payload; })

            // createPayment — action.payload = the created payment doc
            .addCase(createPayment.pending, (state) => { state.isLoading = true; })
            .addCase(createPayment.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Unwrap if still wrapped in envelope (defensive)
                const payment = action.payload?._id ? action.payload : action.payload?.data ?? action.payload;
                if (payment?._id) state.payments.unshift(payment);
            })
            .addCase(createPayment.rejected, (state, action) => { state.isLoading = false; state.isError = true; state.message = action.payload; })

            // updatePayment (admin only) — action.payload = updated payment doc
            .addCase(updatePayment.pending, (state) => { state.isLoading = true; })
            .addCase(updatePayment.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const payment = action.payload?._id ? action.payload : action.payload?.data ?? action.payload;
                const idx = state.payments.findIndex(p => p._id === payment?._id);
                if (idx !== -1) state.payments[idx] = payment;
            })
            .addCase(updatePayment.rejected, (state, action) => { state.isLoading = false; state.isError = true; state.message = action.payload; })

            // deletePayment (admin only)
            .addCase(deletePayment.pending, (state) => { state.isLoading = true; })
            .addCase(deletePayment.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.payments = state.payments.filter(p => p._id !== action.payload);
            })
            .addCase(deletePayment.rejected, (state, action) => { state.isLoading = false; state.isError = true; state.message = action.payload; });
    },
});

export const { reset } = paymentSlice.actions;
export default paymentSlice.reducer;
