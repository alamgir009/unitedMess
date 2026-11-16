import apiClient from '@/services/api/client/apiClient';

export const getReport = async (report, memberId, signal) => {
    const { data } = await apiClient.get(`/admin/analytics/${report}`, {
        params: { months: 3, ...(memberId && { memberId }) }, signal,
    });
    return data.data;
};

export const getMembers = async (q, signal) => {
    const { data } = await apiClient.get('/admin/analytics/members', { params: { q }, signal });
    return data.data.members;
};
