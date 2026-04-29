import apiClient from '@/services/api/client/apiClient';

const NotificationService = {
    getNotifications: async (params = { page: 1, limit: 20 }) => {
        const response = await apiClient.get('/notifications', { params });
        return response.data;
    },

    markAsRead: async (notificationId) => {
        const response = await apiClient.put(`/notifications/${notificationId}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await apiClient.put('/notifications/mark-all-read');
        return response.data;
    }
};

export default NotificationService;
