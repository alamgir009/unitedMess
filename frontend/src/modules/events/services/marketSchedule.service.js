import apiClient from '@/services/api/client/apiClient';

const API_URL = 'markets/schedule';

const getMonthSchedule = async (year, month) => {
    const response = await apiClient.get(`${API_URL}/month/${year}/${month}`);
    return response.data;
};

const getAvailableDates = async (year, month) => {
    const response = await apiClient.get(`${API_URL}/available/${year}/${month}`);
    return response.data;
};

const getMyScheduledDates = async (year, month) => {
    const params = new URLSearchParams({ year, month });
    const response = await apiClient.get(`${API_URL}/my?${params}`);
    return response.data;
};

const selectDates = async (dates, year, month) => {
    const response = await apiClient.post(`${API_URL}/select`, { dates, year, month });
    return response.data;
};

const removeScheduledDate = async (scheduleId) => {
    const response = await apiClient.delete(`${API_URL}/${scheduleId}`);
    return response.data;
};

const getGoogleAuthUrl = async () => {
    const response = await apiClient.get('/auth/google');
    return response.data;
};

const disconnectGoogleCalendar = async () => {
    const response = await apiClient.delete('/auth/google/disconnect');
    return response.data;
};

const getGoogleCalendarStatus = async () => {
    const response = await apiClient.get(`${API_URL}/google-status`);
    return response.data;
};

const syncToGoogleCalendar = async (scheduleIds) => {
    const response = await apiClient.post(`${API_URL}/sync-google`, { scheduleIds });
    return response.data;
};

const marketScheduleService = {
    getMonthSchedule,
    getAvailableDates,
    getMyScheduledDates,
    selectDates,
    removeScheduledDate,
    getGoogleAuthUrl,
    disconnectGoogleCalendar,
    getGoogleCalendarStatus,
    syncToGoogleCalendar,
};

export default marketScheduleService;
