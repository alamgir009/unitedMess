import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/auth.service';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import { setAccessToken, clearAccessToken, authChannel } from '@/services/api/client/apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// restoreSession
// ─────────────────────────────────────────────────────────────────────────────
// Called once on every page load / new tab open (dispatched from SessionGate).
//
// Fast-path:  checks __session cookie  (a server-managed non-httpOnly marker).
//   absent  → no session to restore, skip the API call entirely (no 401 noise).
//   present → attempts POST /auth/refresh-token.
//
// Refresh flow:
//   1. Browser auto-sends the httpOnly refresh cookie along with the request.
//   2. Server rotates the refresh cookie and returns { tokens.accessToken, user }.
//   3. Store accessToken in memory, user in Redux + display cookie.
//   4. sessionRestoring = false  →  ProtectedRoute renders / redirects cleanly.
//
// Why __session instead of localStorage / a user cookie?
//   • __session is set and cleared by the server in lockstep with the real
//     httpOnly refreshToken cookie — never goes stale independently.
//   • Contains zero sensitive data (just the literal string "1").
//   • Invisible to XSS in the same way as the httpOnly cookie (same path,
//     same domain, same Secure / SameSite attributes — except httpOnly).
//
// On failure the __session marker is also cleared (via document.cookie) so
// subsequent page loads skip the refresh attempt immediately rather than
// producing repeated 401s against an already-expired token.
// ─────────────────────────────────────────────────────────────────────────────
export const restoreSession = createAsyncThunk(
    'auth/restoreSession',
    async (_, thunkAPI) => {
        // Fast-path: no session evidence → definitely no session.
        // __session is set by the API server on the root domain (.unitedmess.uk),
        // readable from the frontend JS. The user cookie is set by auth.service
        // on the frontend domain as fallback for cross-subdomain deployments.
        const hasSessionMarker = document.cookie.includes('__session=1');
        const hasUserCookie    = Cookies.get('user');

        if (!hasSessionMarker && !hasUserCookie) {
            clearAccessToken();
            return thunkAPI.fulfillWithValue(null);
        }

        try {
            const { default: apiClient } = await import('@/services/api/client/apiClient');
            const refreshRes = await apiClient.post('auth/refresh-tokens');

            const accessToken = refreshRes.data?.data?.tokens?.accessToken;
            const user        = refreshRes.data?.data?.user;

            if (!accessToken) {
                return thunkAPI.rejectWithValue('No access token returned');
            }

            setAccessToken(accessToken);

            // Keep display cookie in sync (7-day calendar alignment)
            if (user && typeof user === 'object' && user._id) {
                Cookies.set('user', JSON.stringify(user), {
                    expires: 7,
                    secure: import.meta.env.PROD,
                    sameSite: 'strict',
                });
            }

            return user || null;
        } catch (error) {
            // Refresh cookie expired, revoked, or network failure
            clearAccessToken();
            Cookies.remove('user');
            // Clear __session marker to prevent repeated 401s on next load
            document.cookie = `__session=; path=/; max-age=0; SameSite=Lax${import.meta.env.PROD ? '; secure' : ''}`;
            return thunkAPI.rejectWithValue(
                error.response?.data?.message || 'Session expired'
            );
        }
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Async thunks — business actions
// ─────────────────────────────────────────────────────────────────────────────

export const register = createAsyncThunk(
    'auth/register',
    async (userData, thunkAPI) => {
        try {
            const response = await authService.register(userData);
            return response;
        } catch (error) {
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
        // Always proceed with local cleanup even if server call fails
        clearAccessToken();
        Cookies.remove('user');
    } finally {
        // Notify all other tabs to log out immediately
        authChannel.postMessage({ type: 'AUTH_LOGOUT' });
    }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (userData, thunkAPI) => {
    try {
        const response = await authService.updateProfile(userData);
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
        toast.success(response?.message || 'Profile picture updated successfully');
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

export const fetchPayableAmount = createAsyncThunk(
    'auth/fetchPayable',
    async (userId, thunkAPI) => {
        try {
            const response = await authService.getPayableAmount(userId);
            const data = response?.data?.data ?? response?.data ?? response;
            if (typeof data === 'object' && data !== null && 'payableAmount' in data) {
                return data;
            }
            return { payableAmount: Number(data) || 0 };
        } catch (error) {
            const message = error.response?.data?.error || error.response?.data?.message || 'Failed to fetch payable amount';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const fetchPayableGasBill = createAsyncThunk(
    'auth/fetchPayableGasBill',
    async (userId, thunkAPI) => {
        try {
            const response = await authService.getPayableGasBill(userId);
            const data = response?.data?.data ?? response?.data ?? response;
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
            await authService.logout();
            authChannel.postMessage({ type: 'AUTH_LOGOUT' });
            return response;
        } catch (error) {
            const message = error.response?.data?.message || error.response?.data?.error || 'Failed to deactivate account';
            toast.error(message);
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────
// sessionRestoring: true → ProtectedRoute renders a spinner and never redirects
//   to /login until the restore attempt is complete. This prevents the brief
//   "flash to login" that would otherwise happen before the refresh succeeds.
//
// user is intentionally NOT pre-seeded from the cookie here.
// The restoreSession thunk fetches a fresh copy from the server, ensuring
// we never grant access based on stale cookie data (role change, deactivation).
// ─────────────────────────────────────────────────────────────────────────────
const storedAdminShowHistory = localStorage.getItem('adminShowHistory') === 'true';

const initialState = {
    user: null,                        // Always null on cold start — populated by restoreSession
    sessionRestoring: true,            // True until restoreSession settles (success OR failure)
    payableAmount: null,
    payableAmountData: null,
    payableGasBill: null,
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
    registeredEmail: null,
    adminShowHistory: storedAdminShowHistory,
};

// ─────────────────────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────────────────────
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
        // Directly set the user in Redux (used by restoreSession thunk & BroadcastChannel listener)
        setUser: (state, action) => {
            state.user = action.payload;
        },
        // Mark session restore as complete — unblocks ProtectedRoute
        setSessionReady: (state) => {
            state.sessionRestoring = false;
        },
    },
    extraReducers: (builder) => {
        builder

            // ── restoreSession ────────────────────────────────────────────
            .addCase(restoreSession.fulfilled, (state, action) => {
                state.user           = action.payload;
                state.sessionRestoring = false;
            })
            .addCase(restoreSession.rejected, (state) => {
                state.user           = null;
                state.sessionRestoring = false;
            })

            // ── register ─────────────────────────────────────────────────
            .addCase(register.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(register.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = null;
                state.registeredEmail = action.payload?.data?.user?.email || action.payload?.user?.email || null;
                state.message = action.payload?.message || 'Registration successful. Please verify your email.';
            })
            .addCase(register.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.user = null;
            })

            // ── login ─────────────────────────────────────────────────────
            .addCase(login.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload?.data?.user || action.payload?.user || null;
                // Session is definitely ready after a fresh login
                state.sessionRestoring = false;
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.user = null;
            })

            // ── logout ────────────────────────────────────────────────────
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.payableAmount = null;
                state.payableAmountData = null;
                state.sessionRestoring = false;
            })

            // ── updateProfile ─────────────────────────────────────────────
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

            // ── updateAvatar ──────────────────────────────────────────────
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

            // ── fetchPayableAmount ────────────────────────────────────────
            .addCase(fetchPayableAmount.fulfilled, (state, action) => {
                const payload = action.payload;
                if (typeof payload === 'object' && payload !== null) {
                    state.payableAmountData = payload;
                    state.payableAmount = payload.payableAmount ?? 0;
                } else {
                    state.payableAmount = Number(payload) || 0;
                    state.payableAmountData = { payableAmount: state.payableAmount };
                }
            })
            .addCase(fetchPayableAmount.rejected, (state, action) => {
                console.error('Failed to load payable amount:', action.payload);
            })

            // ── fetchPayableGasBill ───────────────────────────────────────
            .addCase(fetchPayableGasBill.fulfilled, (state, action) => {
                state.payableGasBill = action.payload ?? { payableAmount: 0, status: 'pending' };
            })
            .addCase(fetchPayableGasBill.rejected, (state, action) => {
                console.error('Failed to load payable gas bill amount:', action.payload);
            })

            // ── forgotPassword ────────────────────────────────────────────
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

            // ── resetPassword ─────────────────────────────────────────────
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

            // ── resendVerification ────────────────────────────────────────
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

            // ── deactivateAccount ─────────────────────────────────────────
            .addCase(deactivateAccount.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deactivateAccount.fulfilled, (state) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = null;
                state.payableAmount = null;
                state.payableAmountData = null;
                state.payableGasBill = null;
                state.isError = false;
                state.message = '';
            })
            .addCase(deactivateAccount.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    },
});

export const {
    reset,
    toggleAdminHistory,
    clearRegisteredEmail,
    setUser,
    setSessionReady,
} = authSlice.actions;

export default authSlice.reducer;
