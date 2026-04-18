import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import marketService from '../services/market.service';

const initialState = {
    markets: [],
    schedule: [],
    isScheduleLoading: false,
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
        hasNext: false,
        hasPrev: false,
        isAll: false
    },
    isLoading: false,
    isSuccess: false,
    isError: false,
    message: '',
};

// Fetch markets for the authenticated user
export const fetchMarkets = createAsyncThunk('market/fetchAll', async (params, thunkAPI) => {
    try {
        const response = await marketService.getMarkets(params);
        return response.data; // Now returns { markets, pagination }
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Fetch monthly market schedule
export const fetchMarketSchedule = createAsyncThunk('market/fetchSchedule', async ({ year, month }, thunkAPI) => {
    try {
        const response = await marketService.getMarketSchedule(year, month);
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Create new market
export const createMarket = createAsyncThunk('market/create', async (marketData, thunkAPI) => {
    try {
        const response = await marketService.createMarket(marketData);
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Admin create market
export const adminCreateMarket = createAsyncThunk('market/adminCreate', async ({ userId, marketData }, thunkAPI) => {
    try {
        const response = await marketService.adminCreateMarket(userId, marketData);
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Update market
export const updateMarket = createAsyncThunk('market/update', async ({ marketId, marketData }, thunkAPI) => {
    try {
        const response = await marketService.updateMarket(marketId, marketData);
        return response.data; // Server might return updated market object
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Delete market
export const deleteMarket = createAsyncThunk('market/delete', async (marketId, thunkAPI) => {
    try {
        await marketService.deleteMarket(marketId);
        return marketId; // Return IDs so we can filter state
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

export const marketSlice = createSlice({
    name: 'market',
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
            // Fetch Markets
            .addCase(fetchMarkets.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchMarkets.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Handle new { markets, pagination } format vs raw array fallback
                if (action.payload?.markets) {
                    state.markets = action.payload.markets;
                    state.pagination = action.payload.pagination;
                } else {
                    state.markets = Array.isArray(action.payload) ? action.payload : [];
                }
            })
            .addCase(fetchMarkets.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Fetch Market Schedule
            .addCase(fetchMarketSchedule.pending, (state) => {
                state.isScheduleLoading = true;
            })
            .addCase(fetchMarketSchedule.fulfilled, (state, action) => {
                state.isScheduleLoading = false;
                state.schedule = action.payload;
            })
            .addCase(fetchMarketSchedule.rejected, (state, action) => {
                state.isScheduleLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Create market
            .addCase(createMarket.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createMarket.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Add the new market to the beginning of the list
                state.markets.unshift(action.payload);
            })
            .addCase(createMarket.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Admin Create market
            .addCase(adminCreateMarket.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(adminCreateMarket.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Add the new market to the beginning of the list
                state.markets.unshift(action.payload);
            })
            .addCase(adminCreateMarket.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Update market
            .addCase(updateMarket.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateMarket.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Update the market in the state array
                const index = state.markets.findIndex((market) => market._id === action.payload._id);
                if (index !== -1) {
                    state.markets[index] = action.payload;
                }
            })
            .addCase(updateMarket.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Delete market
            .addCase(deleteMarket.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deleteMarket.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Remove the market from the state array
                state.markets = state.markets.filter((market) => market._id !== action.payload);
            })
            .addCase(deleteMarket.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    },
});

export const { reset } = marketSlice.actions;
export default marketSlice.reducer;