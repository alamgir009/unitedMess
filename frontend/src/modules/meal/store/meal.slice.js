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

// Fetch meals for the authenticated user
export const fetchMeals = createAsyncThunk('meal/fetchAll', async (params, thunkAPI) => {
    try {
        const { auth } = thunkAPI.getState();
        const requestParams = { ...params };
        if (auth.user?.role === 'admin' && auth.adminShowHistory) {
            requestParams.allHistory = true;
        }
        const response = await mealService.getMeals(requestParams);
        return response.data; // Now returns { meals, pagination }
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Create new meal
export const createMeal = createAsyncThunk('meal/create', async (mealData, thunkAPI) => {
    try {
        const response = await mealService.createMeal(mealData);
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Admin create meal
export const adminCreateMeal = createAsyncThunk('meal/adminCreate', async ({ userId, mealData }, thunkAPI) => {
    try {
        const response = await mealService.adminCreateMeal(userId, mealData);
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Update meal
export const updateMeal = createAsyncThunk('meal/update', async ({ mealId, mealData }, thunkAPI) => {
    try {
        const response = await mealService.updateMeal(mealId, mealData);
        return response.data; // Server might return updated meal object
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Delete meal
export const deleteMeal = createAsyncThunk('meal/delete', async (mealId, thunkAPI) => {
    try {
        await mealService.deleteMeal(mealId);
        return mealId; // Return IDs so we can filter state
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Vote for meal poll
export const voteMealPoll = createAsyncThunk('meal/votePoll', async (pollData, thunkAPI) => {
    try {
        const response = await mealService.voteMealPoll(pollData);
        // Refresh poll status after voting
        thunkAPI.dispatch(fetchPollStatus(pollData.date));
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});

// Fetch meal poll status
export const fetchPollStatus = createAsyncThunk('meal/fetchPollStatus', async (date, thunkAPI) => {
    try {
        const response = await mealService.getMealPollStatus(date);
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Something went wrong';
        return thunkAPI.rejectWithValue(message);
    }
});


export const mealSlice = createSlice({
    name: 'meal',
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
            // Fetch Meals
            .addCase(fetchMeals.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchMeals.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Handle new { meals, pagination } format vs raw array fallback
                if (action.payload?.meals) {
                    state.meals = action.payload.meals;
                    state.pagination = action.payload.pagination;
                } else {
                    state.meals = Array.isArray(action.payload) ? action.payload : [];
                }
            })
            .addCase(fetchMeals.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Create Meal
            .addCase(createMeal.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createMeal.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Add the new meal to the beginning of the list
                state.meals.unshift(action.payload);
            })
            .addCase(createMeal.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Admin Create Meal
            .addCase(adminCreateMeal.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(adminCreateMeal.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Add the new meal to the beginning of the list
                state.meals.unshift(action.payload);
            })
            .addCase(adminCreateMeal.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Update Meal
            .addCase(updateMeal.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateMeal.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Update the meal in the state array
                const index = state.meals.findIndex((meal) => meal._id === action.payload._id);
                if (index !== -1) {
                    state.meals[index] = action.payload;
                }
            })
            .addCase(updateMeal.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Delete Meal
            .addCase(deleteMeal.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deleteMeal.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Remove the meal from the state array
                state.meals = state.meals.filter((meal) => meal._id !== action.payload);
            })
            .addCase(deleteMeal.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Fetch Poll Status
            .addCase(fetchPollStatus.pending, (state) => {
                // Not setting global isLoading to avoid full page loader
            })
            .addCase(fetchPollStatus.fulfilled, (state, action) => {
                state.pollStatus = action.payload;
            })
            .addCase(fetchPollStatus.rejected, (state, action) => {
                state.message = action.payload;
            });
    },
});

export const { reset } = mealSlice.actions;
export default mealSlice.reducer;