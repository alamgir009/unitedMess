import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import mealService from '../services/meal.service';

const initialState = {
    meals: [],
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
    pollStatus: null, // { date, votes, stats }
};

/**
 * The backend wraps all responses in { success, message, data }.
 * This helper unwraps to the inner data payload, with a raw-array fallback
 * for any endpoint that might return data directly.
 */
const unwrap = (payload) => payload?.data ?? payload;

// ─── Async Thunks ────────────────────────────────────────────────────────────

// Fetch meals for the authenticated user (or all meals for admin)
export const fetchMeals = createAsyncThunk('meal/fetchAll', async (params, thunkAPI) => {
    try {
        const response = await mealService.getMeals(params);
        return response.data; // { meals, pagination } inside the envelope
    } catch (error) {
        const message =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Create new meal (regular user)
export const createMeal = createAsyncThunk('meal/create', async (mealData, thunkAPI) => {
    try {
        const response = await mealService.createMeal(mealData);
        return response.data; // wrapped in { success, message, data: meal }
    } catch (error) {
        const message =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Bulk create meals for date range
export const bulkCreateMeals = createAsyncThunk('meal/bulkCreate', async (bulkData, thunkAPI) => {
    try {
        const response = await mealService.bulkCreateMeals(bulkData);
        return response.data;
    } catch (error) {
        const message =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Create meal for a specific user (admin)
export const adminCreateMeal = createAsyncThunk(
    'meal/adminCreate',
    async ({ userId, mealData }, thunkAPI) => {
        try {
            const response = await mealService.adminCreateMeal(userId, mealData);
            return response.data;
        } catch (error) {
            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                'Something went wrong';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Update meal
export const updateMeal = createAsyncThunk(
    'meal/update',
    async ({ mealId, mealData }, thunkAPI) => {
        try {
            const response = await mealService.updateMeal(mealId, mealData);
            return response.data;
        } catch (error) {
            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                'Something went wrong';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Delete meal — returns the deleted mealId for optimistic state removal
export const deleteMeal = createAsyncThunk('meal/delete', async (mealId, thunkAPI) => {
    try {
        await mealService.deleteMeal(mealId);
        return mealId; // Return original ID for state filter
    } catch (error) {
        const message =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Vote for meal poll — the thunk internally re-fetches poll status via voteMealPoll service
export const voteMealPoll = createAsyncThunk('meal/votePoll', async (pollData, thunkAPI) => {
    try {
        const response = await mealService.voteMealPoll(pollData);
        // Re-fetch poll status so the UI reflects the latest tallies
        thunkAPI.dispatch(fetchPollStatus(pollData.date));
        return response.data;
    } catch (error) {
        const message =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Fetch poll status for a specific date
export const fetchPollStatus = createAsyncThunk(
    'meal/fetchPollStatus',
    async (date, thunkAPI) => {
        try {
            const response = await mealService.getMealPollStatus(date);
            return response.data;
        } catch (error) {
            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                'Something went wrong';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

export const mealSlice = createSlice({
    name: 'meal',
    initialState,
    reducers: {
        // Reset transient status flags only — does NOT clear meal data
        reset: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError   = false;
            state.message   = '';
        },
    },
    extraReducers: (builder) => {
        builder
            // ── Fetch Meals ────────────────────────────────────────────────
            .addCase(fetchMeals.pending, (state) => {
                state.isLoading = true;
                state.isError   = false;
                state.message   = '';
            })
            .addCase(fetchMeals.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Server returns { success, message, data: { meals, pagination } }
                // meal.service.js returns response.data (the full envelope),
                // so action.payload is the envelope object.
                const data = unwrap(action.payload);
                if (data?.meals) {
                    state.meals      = data.meals;
                    state.pagination = data.pagination;
                } else if (Array.isArray(data)) {
                    // Fallback: raw array (shouldn't happen with current backend)
                    state.meals = data;
                } else {
                    state.meals = [];
                }
            })
            .addCase(fetchMeals.rejected, (state, action) => {
                state.isLoading = false;
                state.isError   = true;
                state.message   = action.payload;
            })

            // ── Create Meal ────────────────────────────────────────────────
            .addCase(createMeal.pending, (state) => {
                state.isLoading = true;
                state.isError   = false;
            })
            .addCase(createMeal.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Unwrap the API envelope to get the raw meal document
                const meal = unwrap(action.payload);
                if (meal?._id) state.meals.unshift(meal);
            })
            .addCase(createMeal.rejected, (state, action) => {
                state.isLoading = false;
                state.isError   = true;
                state.message   = action.payload;
            })

            // ── Admin Create Meal ──────────────────────────────────────────
            .addCase(adminCreateMeal.pending, (state) => {
                state.isLoading = true;
                state.isError   = false;
            })
            .addCase(adminCreateMeal.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const meal = unwrap(action.payload);
                if (meal?._id) state.meals.unshift(meal);
            })
            .addCase(adminCreateMeal.rejected, (state, action) => {
                state.isLoading = false;
                state.isError   = true;
                state.message   = action.payload;
            })

            // ── Bulk Create Meal ───────────────────────────────────────────
            .addCase(bulkCreateMeals.pending, (state) => {
                state.isLoading = true;
                state.isError   = false;
            })
            .addCase(bulkCreateMeals.fulfilled, (state) => {
                state.isLoading = false;
                state.isSuccess = true;
            })
            .addCase(bulkCreateMeals.rejected, (state, action) => {
                state.isLoading = false;
                state.isError   = true;
                state.message   = action.payload;
            })

            // ── Update Meal ────────────────────────────────────────────────
            .addCase(updateMeal.pending, (state) => {
                state.isLoading = true;
                state.isError   = false;
            })
            .addCase(updateMeal.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Unwrap before looking up — action.payload._id was undefined before
                const updated = unwrap(action.payload);
                if (updated?._id) {
                    const idx = state.meals.findIndex((m) => m._id === updated._id);
                    if (idx !== -1) state.meals[idx] = updated;
                }
            })
            .addCase(updateMeal.rejected, (state, action) => {
                state.isLoading = false;
                state.isError   = true;
                state.message   = action.payload;
            })

            // ── Delete Meal ────────────────────────────────────────────────
            .addCase(deleteMeal.pending, (state) => {
                state.isLoading = true;
                state.isError   = false;
            })
            .addCase(deleteMeal.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // action.payload is the raw mealId string passed to the thunk
                state.meals = state.meals.filter((m) => m._id !== action.payload);
            })
            .addCase(deleteMeal.rejected, (state, action) => {
                state.isLoading = false;
                state.isError   = true;
                state.message   = action.payload;
            })

            // ── Fetch Poll Status ──────────────────────────────────────────
            // Deliberately NOT setting the global isLoading flag here so that
            // poll fetches don't disable other UI (e.g., vote buttons).
            .addCase(fetchPollStatus.pending,   () => {})
            .addCase(fetchPollStatus.fulfilled, (state, action) => {
                // Poll status is nested under .data in the envelope
                state.pollStatus = unwrap(action.payload) ?? action.payload;
            })
            .addCase(fetchPollStatus.rejected, (state, action) => {
                state.message = action.payload;
            })

            // ── Vote Meal Poll ─────────────────────────────────────────────
            .addCase(voteMealPoll.pending,   () => {})
            .addCase(voteMealPoll.fulfilled, () => {})
            .addCase(voteMealPoll.rejected,  (state, action) => {
                state.message = action.payload;
            });
    },
});

export const { reset } = mealSlice.actions;
export default mealSlice.reducer;