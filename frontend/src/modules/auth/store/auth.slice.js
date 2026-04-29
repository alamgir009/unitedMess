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

export const updateProfile = createAsyncThunk('auth/updateProfile', async (userData, thunkAPI) => {
    try {
        const response = await authService.updateProfile(userData);
        // backend sometimes uses response.message for success
        toast.success(response.message || 'Profile updated successfully');
        return response;
    } catch (error) {
        const message =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            'Profile update failed';
        toast.error(message);
        return thunkAPI.rejectWithValue(message);
    }
});

export const updateAvatar = createAsyncThunk('auth/updateAvatar', async (formData, thunkAPI) => {
    try {
        const response = await authService.updateAvatar(formData);
        toast.success(response?.data?.message || 'Profile picture updated successfully');
        return response;
    } catch (error) {
        const message =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            'Avatar update failed';
        toast.error(message);
        return thunkAPI.rejectWithValue(message);
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

export const forgotPassword = createAsyncThunk(
    'auth/forgotPassword',
    async (email, thunkAPI) => {
        try {
            const response = await authService.forgotPassword(email);
            toast.success('Password reset link sent to your email');
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.response?.data?.error || 'Failed to send reset link';
            toast.error(message);
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const resetPassword = createAsyncThunk(
    'auth/resetPassword',
    async ({ token, password }, thunkAPI) => {
        try {
            const response = await authService.resetPassword(token, password);
            toast.success('Password reset successfully. You can now login.');
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.response?.data?.error || 'Failed to reset password';
            toast.error(message);
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const resendVerification = createAsyncThunk(
    'auth/resendVerification',
    async (email, thunkAPI) => {
        try {
            const response = await authService.resendVerification(email);
            toast.success('Verification email resent successfully');
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.response?.data?.error || 'Failed to resend verification';
            toast.error(message);
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const deactivateAccount = createAsyncThunk(
    'auth/deactivateAccount',
    async (_, thunkAPI) => {
        try {
            const response = await authService.deactivateAccount();
            toast.success('Your account has been deactivated.');
            // Also call logout locally to clear cookies/tokens
            await authService.logout();
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.response?.data?.error || 'Failed to deactivate account';
            toast.error(message);
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

// Initialise adminShowHistory from localStorage
const storedAdminShowHistory = localStorage.getItem('adminShowHistory') === 'true';

const initialState = {
    user: parsedUser,
    payableAmount: null,      // backward-compat: numeric payable (or null)
    payableAmountData: null,  // full breakdown object from /users/me/payable
    payableGasBill: null,     // gas bill payable
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
    registeredEmail: null, // Temporary storage for registration success state
    adminShowHistory: storedAdminShowHistory,
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
        toggleAdminHistory: (state) => {
            state.adminShowHistory = !state.adminShowHistory;
            localStorage.setItem('adminShowHistory', state.adminShowHistory);
        },
        clearRegisteredEmail: (state) => {
            state.registeredEmail = null;
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
                // We no longer set state.user automatically on registration
                // because the user must verify email and wait for admin approval
                state.user = null;
                // Store the email so the RegisterPage can show it and handle resend
                state.registeredEmail = action.payload?.data?.user?.email || action.payload?.user?.email || null;
                state.message = action.payload?.message || 'Registration successful. Please verify your email.';
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
            // Update Profile
            .addCase(updateProfile.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const updatedUser = action.payload?.data?.user || action.payload?.data || action.payload?.user;
                if (updatedUser && typeof updatedUser === 'object' && updatedUser._id) {
                    state.user = updatedUser;
                }
            })
            .addCase(updateProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Update Avatar
            .addCase(updateAvatar.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateAvatar.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const updatedUser = action.payload?.data?.user || action.payload?.data || action.payload?.user;
                if (updatedUser && typeof updatedUser === 'object' && updatedUser._id) {
                    state.user = updatedUser;
                }
            })
            .addCase(updateAvatar.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
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
            })
            // Forgot Password
            .addCase(forgotPassword.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
            })
            .addCase(forgotPassword.fulfilled, (state) => {
                state.isLoading = false;
                state.isSuccess = true;
            })
            .addCase(forgotPassword.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Reset Password
            .addCase(resetPassword.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
            })
            .addCase(resetPassword.fulfilled, (state) => {
                state.isLoading = false;
                state.isSuccess = true;
            })
            .addCase(resetPassword.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Resend Verification
            .addCase(resendVerification.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(resendVerification.fulfilled, (state) => {
                state.isLoading = false;
                state.isSuccess = true;
            })
            .addCase(resendVerification.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Deactivate Account
            .addCase(deactivateAccount.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deactivateAccount.fulfilled, (state) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = null;
                state.payableAmount = null;
                state.payableAmountData = null;
            })
            .addCase(deactivateAccount.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    },
});

export const { reset, toggleAdminHistory, clearRegisteredEmail } = authSlice.actions;
export default authSlice.reducer;
