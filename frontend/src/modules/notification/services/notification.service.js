import apiClient from '@/services/api/client/apiClient';

const NotificationService = {
    getNotifications: async (params = { page: 1, limit: 20 }) => {
        const response = await apiClient.get('/notifications', { params });
        return response.data;
    },

    markAsRead: async (notificationId) => {
        const response = await apiClient.post(`/notifications/${notificationId}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await apiClient.post('/notifications/read-all');
        return response.data;
    },

    subscribeToPush: async (subscription) => {
        const response = await apiClient.post('/notifications/subscribe', subscription);
        return response.data;
    },

    unsubscribeFromPush: async (endpoint) => {
        const response = await apiClient.delete('/notifications/subscribe', {
            data: { endpoint },
        });
        return response.data;
    },

    sendAdminNotification: async (payload) => {
        const response = await apiClient.post('/notifications/admin/custom', payload);
        return response.data;
    },

    getPushConfig: async () => {
        const response = await apiClient.get('/notifications/push-config');
        return response.data;
    },
};

export default NotificationService;
