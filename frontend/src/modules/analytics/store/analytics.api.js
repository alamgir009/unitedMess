import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { getReport, getMembers } from '../services/analytics.service';

const errorPayload = (error) => ({ status: error.response?.status || 'FETCH_ERROR', message: error.response?.data?.message || error.message || 'Analytics could not be loaded. Please retry.' });
const allowed = (api, viewerId) => {
    const { user } = api.getState().auth;
    return user && (user._id || user.id) === viewerId && user.role === 'admin' && user.isActive !== false && user.userStatus === 'approved';
};
export const analyticsApi = createApi({
    reducerPath: 'analyticsApi', baseQuery: fakeBaseQuery(),
    keepUnusedDataFor: 1800, refetchOnMountOrArgChange: 60,
    tagTypes: ['AnalyticsReport', 'AnalyticsMembers'],
    endpoints: (builder) => ({
        getAnalyticsReport: builder.query({
            async queryFn({ viewerId, report, memberId }, api) {
                if (!allowed(api, viewerId)) return { error: { status: 403, message: 'Analytics is available to administrators only.' } };
                try { return { data: await getReport(report, memberId, api.signal) }; }
                catch (error) { return { error: errorPayload(error) }; }
            },
            providesTags: (result, error, { report }) => [{ type: 'AnalyticsReport', id: report }],
        }),
        getAnalyticsMembers: builder.query({
            async queryFn({ viewerId, q }, api) {
                if (!allowed(api, viewerId)) return { error: { status: 403, message: 'Analytics is available to administrators only.' } };
                try { return { data: await getMembers(q, api.signal) }; }
                catch (error) { return { error: errorPayload(error) }; }
            },
            providesTags: ['AnalyticsMembers'],
        }),
    }),
});
export const { useGetAnalyticsReportQuery, useGetAnalyticsMembersQuery } = analyticsApi;
