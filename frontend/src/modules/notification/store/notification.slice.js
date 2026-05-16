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
    async (notificationId, { dispatch, rejectWithValue }) => {
        dispatch(markAsReadOptimistic(notificationId));
        try {
            const data = await NotificationService.markAsRead(notificationId);
            return data.data;
        } catch (error) {
            dispatch(markAsReadRollback(notificationId));
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
    markAllLoading: false,
    lastRealtimeUpdate: null,
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
            state.lastRealtimeUpdate = Date.now();
        },
        resetNotifications: (state) => {
            state.items = [];
            state.unreadCount = 0;
            state.pagination = { page: 1, limit: 20, total: 0, pages: 0 };
            state.lastRealtimeUpdate = null;
        },
        markAsReadOptimistic: (state, action) => {
            const id = action.payload;
            const index = state.items.findIndex(n => n.id === id || n._id === id);
            if (index !== -1 && !state.items[index].isRead) {
                state.items[index].isRead = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        markAsReadRollback: (state, action) => {
            const id = action.payload;
            const index = state.items.findIndex(n => n.id === id || n._id === id);
            if (index !== -1 && state.items[index].isRead) {
                state.items[index].isRead = false;
                state.unreadCount += 1;
            }
        },
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
                const { notifications, unreadCount, pagination } = action.payload.data;
                if (pagination.page === 1) {
                    state.items = notifications;
                } else {
                    const newItems = notifications.filter(
                        newNotif => !state.items.some(
                            oldNotif => (oldNotif._id || oldNotif.id) === (newNotif._id || newNotif.id)
                        )
                    );
                    state.items = [...state.items, ...newItems];
                }
                state.unreadCount = unreadCount;
                state.pagination = pagination;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Mark As Read (fallback for when optimistic succeeds)
            .addCase(markAsRead.fulfilled, (state, action) => {
                const updatedNotification = action.payload;
                const index = state.items.findIndex(n => n.id === updatedNotification.id || n._id === updatedNotification._id);
                if (index !== -1 && !state.items[index].isRead) {
                    state.items[index].isRead = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })
            // Mark All As Read
            .addCase(markAllAsRead.pending, (state) => {
                state.markAllLoading = true;
            })
            .addCase(markAllAsRead.fulfilled, (state) => {
                state.items.forEach(n => { n.isRead = true; });
                state.unreadCount = 0;
                state.markAllLoading = false;
            })
            .addCase(markAllAsRead.rejected, (state) => {
                state.markAllLoading = false;
            });
    }
});

export const { addRealTimeNotification, resetNotifications, markAsReadOptimistic, markAsReadRollback } = notificationSlice.actions;
export default notificationSlice.reducer;
