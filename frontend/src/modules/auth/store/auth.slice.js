import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/auth.service';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';

// Async thunks
export const register = createAsyncThunk(
    'auth/register',
    async (userData, thunkAPI) => {
        try {
            const response = await authService.register(userData);
            return response;
        } catch (error) {
            // Backend error middleware sends { success: false, error: '...' }
            // Some endpoints may also use { message: '...' }
            const message =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Registration failed';
            toast.error(message);
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const login = createAsyncThunk(
    'auth/login',
    async (userData, thunkAPI) => {
        try {
            const response = await authService.login(userData);
            return response;
        } catch (error) {
            const message =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Login failed';
            toast.error(message);
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const logout = createAsyncThunk('auth/logout', async () => {
    try {
        await authService.logout();
    } catch (error) {
        console.error("Logout error", error);
    }
});

// Fetch payable amount for meal — returns full breakdown object
export const fetchPayableAmount = createAsyncThunk(
    'auth/fetchPayable',
    async (userId, thunkAPI) => {
        try {
            const response = await authService.getPayableAmount(userId);
            // user.controller does: sendSuccessResponse(res, 200, '...', payingAmount)
            // payingAmount is an object: { grandTotalMarketAmount, grandTotalMeal, totalGuestRevenue,
            //   adjustedMealCharge, userStats: { ... }, payableAmount }
            const data = response?.data?.data ?? response?.data ?? response;
            // Return the full object so the invoice panel can render all fields
            if (typeof data === 'object' && data !== null && 'payableAmount' in data) {
                return data; // full breakdown
            }
            return { payableAmount: Number(data) || 0 };
        } catch (error) {
            const message = error.response?.data?.error || error.response?.data?.message || 'Failed to fetch payable amount';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Fetch payable gas bill amount
export const fetchPayableGasBill = createAsyncThunk(
    'auth/fetchPayableGasBill',
    async (userId, thunkAPI) => {
        try {
            const response = await authService.getPayableGasBill(userId);
            const data = response?.data?.data ?? response?.data ?? response;
            // Keep the full { payableAmount, status } object so the UI can check payment status.
            // Backend returns { payableAmount: number, status: 'pending'|'success'|... }
            if (typeof data === 'object' && data !== null) {
                return {
                    payableAmount: Number(data.payableAmount) || 0,
                    status: data.status || 'pending',
                };
            }
            return { payableAmount: Number(data) || 0, status: 'pending' };
        } catch (error) {
            const message = error.response?.data?.error || error.response?.data?.message || 'Failed to fetch payable gas bill amount';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

let userCookie = Cookies.get('user');
let parsedUser = null;
if (userCookie) {
    try {
        parsedUser = JSON.parse(userCookie);
    } catch (e) {
        console.error("Failed to parse user cookie", e);
    }
}

const initialState = {
    user: parsedUser,
    payableAmount: null,      // backward-compat: numeric payable (or null)
    payableAmountData: null,  // full breakdown object from /users/me/payable
    payableGasBill: null,     // gas bill payable
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
};

export const authSlice = createSlice({
    name: 'auth',
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
            .addCase(register.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(register.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Backend wraps user in data: { user } via sendSuccessResponse
                state.user = action.payload?.data?.user || action.payload?.user || null;
            })
            .addCase(register.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.user = null;
            })
            .addCase(login.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Backend wraps user in data: { user } via sendSuccessResponse
                state.user = action.payload?.data?.user || action.payload?.user || null;
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.user = null;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.payableAmount = null;
                state.payableAmountData = null;
            })
            // Payable Amount — action.payload is now the full breakdown object
            .addCase(fetchPayableAmount.fulfilled, (state, action) => {
                const payload = action.payload;
                if (typeof payload === 'object' && payload !== null) {
                    state.payableAmountData = payload; // full object (includes paymentStatus, gasBillStatus)
                    state.payableAmount = payload.payableAmount ?? 0; // numeric for backward-compat
                } else {
                    state.payableAmount = Number(payload) || 0;
                    state.payableAmountData = { payableAmount: state.payableAmount };
                }
            })
            .addCase(fetchPayableAmount.rejected, (state, action) => {
                console.error("Failed to load payable amount:", action.payload);
            })
            // Payable Gas Bill — store { payableAmount, status } object
            .addCase(fetchPayableGasBill.fulfilled, (state, action) => {
                // action.payload = { payableAmount: number, status: string }
                state.payableGasBill = action.payload ?? { payableAmount: 0, status: 'pending' };
            })
            .addCase(fetchPayableGasBill.rejected, (state, action) => {
                console.error("Failed to load payable gas bill amount:", action.payload);
            });
    },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;
