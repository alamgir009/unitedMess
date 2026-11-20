import apiClient from '@/services/api/client/apiClient';

export const reportParams = (type, memberId) => ({ type, months: 3, ...(memberId && { memberId }) });
export async function downloadReport(params, signal) {
    try {
        const response = await apiClient.get('/admin/analytics/report.pdf', { params, responseType: 'blob', signal });
        const filename = response.headers['content-disposition']?.match(/filename="([a-zA-Z0-9_.-]+)"/)?.[1] || `analytics-${params.type}-${params.memberId || 'all'}.pdf`;
        return { blob: response.data, filename };
    } catch (error) {
        if (error.response?.data instanceof Blob) {
            try { error.message = JSON.parse(await error.response.data.text()).message || 'Could not download the report.'; }
            catch (_) { error.message = 'Could not download the report. Please retry.'; }
        }
        throw error;
    }
}
export const previewRecipients = async (params, signal) => (await apiClient.get('/admin/analytics/report/recipients', { params, signal })).data.data;
export const emailReport = async (params, recipients, key, signal) => (await apiClient.post('/admin/analytics/report/email', { ...params, recipients }, { headers: { 'Idempotency-Key': key }, signal })).data.data;
export const getReportJob = async (id, signal) => (await apiClient.get(`/admin/analytics/report/jobs/${id}`, { signal })).data.data;
export const retryReportJob = async (id, signal) => (await apiClient.post(`/admin/analytics/report/jobs/${id}/retry`, {}, { signal })).data.data;
