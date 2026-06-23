import apiClient from '@/services/api/client/apiClient';

// Backend now supports startDate/endDate params for date-range filtering,
// but we keep a high limit as a safety net in case of timezone edge-cases.
// Each endpoint returns the standard { success, message, data: { ... } } envelope.
// Non-admin users only see their own data (backend enforces filter.user = req.user.id).
const getMeals = async ({ signal, startDate, endDate } = {}) => {
  const params = new URLSearchParams({ page: 1, limit: 9999 });
  if (startDate) params.set('startDate', startDate);
  if (endDate)   params.set('endDate', endDate);
  const response = await apiClient.get(`meals?${params}`, { signal });
  return response.data;
};

const getMarkets = async ({ signal, startDate, endDate } = {}) => {
  const params = new URLSearchParams({ page: 1, limit: 9999 });
  if (startDate) params.set('startDate', startDate);
  if (endDate)   params.set('endDate', endDate);
  const response = await apiClient.get(`markets?${params}`, { signal });
  return response.data;
};

const getPayments = async ({ signal, startDate, endDate } = {}) => {
  const params = new URLSearchParams({ page: 1, limit: 9999 });
  if (startDate) params.set('startDate', startDate);
  if (endDate)   params.set('endDate', endDate);
  const response = await apiClient.get(`payments?${params}`, { signal });
  return response.data;
};

const eventService = {
  getMeals,
  getMarkets,
  getPayments,
};

export default eventService;
