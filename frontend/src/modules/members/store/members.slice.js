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
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
};

export const fetchUsers = createAsyncThunk(
    'members/fetchUsers',
    async (params, thunkAPI) => {
        try {
            return await membersService.getUsers(params);
        } catch (error) {
            const message =
                (error.response &&
                    error.response.data &&
                    error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const searchUsers = createAsyncThunk(
    'members/searchUsers',
    async (params, thunkAPI) => {
        try {
            return await membersService.searchUsers(params);
        } catch (error) {
            const message =
                (error.response &&
                    error.response.data &&
                    error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// We can just use one slice for all these actions, 
// but often we just re-fetch the users after an action to ensure state consistency.
export const approveUser = createAsyncThunk(
    'members/approveUser',
    async (userId, thunkAPI) => {
        try {
            return await membersService.approveUser(userId);
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) || error.message;
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
            const message =
                (error.response && error.response.data && error.response.data.message) || error.message;
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const updatePaymentStatus = createAsyncThunk(
    'members/updatePaymentStatus',
    async ({ userId, paymentData }, thunkAPI) => {
        try {
            return await membersService.updatePaymentStatus(userId, paymentData);
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) || error.message;
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const updateGasBillStatus = createAsyncThunk(
    'members/updateGasBillStatus',
    async ({ userId, gasBillData }, thunkAPI) => {
        try {
            return await membersService.updateGasBillStatus(userId, gasBillData);
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) || error.message;
            return thunkAPI.rejectWithValue(message);
        }
    }
);


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
            // Fetch Users
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
            // Search Users
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
            });
            // We can add optimistic UI updates for approve/deny here if we want,
            // but typical pattern is to just dispatch fetchUsers() again in the component after success.
    },
});

export const { reset } = membersSlice.actions;
export default membersSlice.reducer;
