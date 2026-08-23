import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import marketScheduleService from '../services/marketSchedule.service';

export const fetchMonthSchedule = createAsyncThunk(
    'marketSchedule/fetchMonth',
    async ({ year, month }, thunkAPI) => {
        try {
            const response = await marketScheduleService.getMonthSchedule(year, month);
            return { year, month, data: response.data };
        } catch (error) {
            const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch schedule';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const fetchAvailableDates = createAsyncThunk(
    'marketSchedule/fetchAvailable',
    async ({ year, month }, thunkAPI) => {
        try {
            const response = await marketScheduleService.getAvailableDates(year, month);
            return { year, month, data: response.data };
        } catch (error) {
            const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch available dates';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const fetchMyScheduledDates = createAsyncThunk(
    'marketSchedule/fetchMy',
    async ({ year, month }, thunkAPI) => {
        try {
            const response = await marketScheduleService.getMyScheduledDates(year, month);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch your dates';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const selectMarketDates = createAsyncThunk(
    'marketSchedule/selectDates',
    async ({ dates, year, month }, thunkAPI) => {
        try {
            const response = await marketScheduleService.selectDates(dates, year, month);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to select dates';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const removeMarketScheduledDate = createAsyncThunk(
    'marketSchedule/removeDate',
    async (scheduleId, thunkAPI) => {
        try {
            await marketScheduleService.removeScheduledDate(scheduleId);
            return scheduleId;
        } catch (error) {
            const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to remove date';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const fetchGoogleCalendarStatus = createAsyncThunk(
    'marketSchedule/fetchGoogleStatus',
    async (_, thunkAPI) => {
        try {
            const response = await marketScheduleService.getGoogleCalendarStatus();
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.message);
        }
    }
);

export const connectGoogleCalendar = createAsyncThunk(
    'marketSchedule/connectGoogle',
    async (_, thunkAPI) => {
        try {
            const response = await marketScheduleService.getGoogleAuthUrl();
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.message);
        }
    }
);

export const disconnectGoogleCalendar = createAsyncThunk(
    'marketSchedule/disconnectGoogle',
    async (_, thunkAPI) => {
        try {
            await marketScheduleService.disconnectGoogleCalendar();
            return { connected: false, syncEnabled: false };
        } catch (error) {
            return thunkAPI.rejectWithValue(error.message);
        }
    }
);

const initialState = {
    monthSchedule: {},
    availableDates: {},
    mySelectedDates: [],
    isLoading: false,
    isSelecting: false,
    error: null,
    googleCalendarConnected: false,
    googleCalendarSyncEnabled: false,
};

const marketScheduleSlice = createSlice({
    name: 'marketSchedule',
    initialState,
    reducers: {
        clearScheduleError: (state) => {
            state.error = null;
        },
        clearMySelectedDates: (state) => {
            state.mySelectedDates = [];
        },
        resetScheduleState: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMonthSchedule.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchMonthSchedule.fulfilled, (state, action) => {
                state.isLoading = false;
                const key = `${action.payload.year}-${action.payload.month}`;
                state.monthSchedule[key] = action.payload.data;
            })
            .addCase(fetchMonthSchedule.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchAvailableDates.pending, (state) => {
                state.error = null;
            })
            .addCase(fetchAvailableDates.fulfilled, (state, action) => {
                const key = `${action.payload.year}-${action.payload.month}`;
                state.availableDates[key] = action.payload.data;
            })
            .addCase(fetchAvailableDates.rejected, (state, action) => {
                state.error = action.payload;
            })
            .addCase(fetchMyScheduledDates.fulfilled, (state, action) => {
                state.mySelectedDates = action.payload || [];
            })
            .addCase(fetchMyScheduledDates.rejected, (state, action) => {
                state.error = action.payload;
            })
            .addCase(selectMarketDates.pending, (state) => {
                state.isSelecting = true;
                state.error = null;
            })
            .addCase(selectMarketDates.fulfilled, (state, action) => {
                state.isSelecting = false;
            })
            .addCase(selectMarketDates.rejected, (state, action) => {
                state.isSelecting = false;
                state.error = action.payload;
            })
            .addCase(removeMarketScheduledDate.fulfilled, (state, action) => {
                state.mySelectedDates = state.mySelectedDates.filter(
                    (d) => d._id !== action.payload
                );
            })
            .addCase(removeMarketScheduledDate.rejected, (state, action) => {
                state.error = action.payload;
            })
            .addCase(fetchGoogleCalendarStatus.fulfilled, (state, action) => {
                state.googleCalendarConnected = action.payload?.connected ?? false;
                state.googleCalendarSyncEnabled = action.payload?.syncEnabled ?? false;
            })
            .addCase(fetchGoogleCalendarStatus.rejected, (state, action) => {
                state.error = action.payload;
            })
            .addCase(connectGoogleCalendar.fulfilled, (state, action) => {
                if (action.payload?.url) {
                    window.location.href = action.payload.url;
                }
            })
            .addCase(connectGoogleCalendar.rejected, (state, action) => {
                state.error = action.payload;
            })
            .addCase(disconnectGoogleCalendar.fulfilled, (state, action) => {
                state.googleCalendarConnected = action.payload?.connected ?? false;
                state.googleCalendarSyncEnabled = action.payload?.syncEnabled ?? false;
            })
            .addCase(disconnectGoogleCalendar.rejected, (state, action) => {
                state.error = action.payload;
            });
    },
});

export const { clearScheduleError, clearMySelectedDates, resetScheduleState } = marketScheduleSlice.actions;
export default marketScheduleSlice.reducer;
