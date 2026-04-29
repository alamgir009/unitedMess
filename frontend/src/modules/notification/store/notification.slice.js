import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import NotificationService from '../services/notification.service';

export const fetchNotifications = createAsyncThunk(
    'notification/fetchNotifications',
    async (params, { rejectWithValue }) => {
        try {
            return await NotificationService.getNotifications(params);
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch notifications');
        }
    }
);

export const markAsRead = createAsyncThunk(
    'notification/markAsRead',
    async (notificationId, { rejectWithValue }) => {
        try {
            const data = await NotificationService.markAsRead(notificationId);
            return data.data; // Return the updated notification
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to mark as read');
        }
    }
);

export const markAllAsRead = createAsyncThunk(
    'notification/markAllAsRead',
    async (_, { rejectWithValue }) => {
        try {
            await NotificationService.markAllAsRead();
            return true;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to mark all as read');
        }
    }
);

const initialState = {
    items: [],
    unreadCount: 0,
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    loading: false,
    error: null,
};

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        addRealTimeNotification: (state, action) => {
            const notification = action.payload;
            state.items.unshift(notification);
            if (!notification.isRead) {
                state.unreadCount += 1;
            }
        },
        resetNotifications: (state) => {
            state.items = [];
            state.unreadCount = 0;
            state.pagination = { page: 1, limit: 20, total: 0, pages: 0 };
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Notifications
            .addCase(fetchNotifications.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.data.notifications;
                state.unreadCount = action.payload.data.unreadCount;
                state.pagination = action.payload.data.pagination;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Mark As Read
            .addCase(markAsRead.fulfilled, (state, action) => {
                const updatedNotification = action.payload;
                const index = state.items.findIndex(n => n.id === updatedNotification.id || n._id === updatedNotification._id);
                if (index !== -1 && !state.items[index].isRead) {
                    state.items[index].isRead = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })
            // Mark All As Read
            .addCase(markAllAsRead.fulfilled, (state) => {
                state.items.forEach(n => { n.isRead = true; });
                state.unreadCount = 0;
            });
    }
});

export const { addRealTimeNotification, resetNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
