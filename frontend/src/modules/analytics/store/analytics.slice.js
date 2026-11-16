import { createSlice } from '@reduxjs/toolkit';

export const ALL_MEMBERS = { _id: '', name: 'All members', email: '' };
const initialState = { report: 'market', member: ALL_MEMBERS, selectedMonth: '', windowKey: '', epoch: 0, accessError: null, suspended: false };
const slice = createSlice({
    name: 'analyticsUi', initialState,
    reducers: {
        selectReport: (state, { payload }) => { state.report = payload; },
        selectMember: (state, { payload }) => { state.member = payload; },
        selectMonth: (state, { payload }) => { state.selectedMonth = payload; },
        reportingWindowChanged: (state, { payload }) => {
            if (state.windowKey !== payload) { state.windowKey = payload; state.selectedMonth = ''; }
        },
        resetAnalyticsSession: (state, { payload }) => ({ ...initialState, epoch: state.epoch + 1, suspended: Boolean(payload?.suspended) }),
        analyticsAccessDenied: (state, { payload }) => { state.accessError = payload; state.member = ALL_MEMBERS; },
        analyticsDataChanged: () => {},
    },
});
export const { selectReport, selectMember, selectMonth, reportingWindowChanged, resetAnalyticsSession, analyticsAccessDenied, analyticsDataChanged } = slice.actions;
export default slice.reducer;
