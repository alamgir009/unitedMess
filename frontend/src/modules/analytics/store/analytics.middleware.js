import { analyticsApi } from './analytics.api';
import { analyticsAccessDenied, analyticsDataChanged, resetAnalyticsSession } from './analytics.slice';

const identity = (state) => {
    const user = state.auth.user;
    return user ? `${user._id || user.id}:${user.role}:${user.isActive}:${user.userStatus}` : '';
};
export const analyticsMiddleware = (store) => {
    let timer;
    const tags = new Set();
    const clear = () => { clearTimeout(timer); tags.clear(); };
    return (next) => (action) => {
        const previous = identity(store.getState());
        const result = next(action);
        if (previous !== identity(store.getState()) || action.type === 'auth/logout/pending') {
            clear();
            store.dispatch(analyticsApi.util.getRunningQueriesThunk()).forEach((query) => query.abort());
            store.dispatch(resetAnalyticsSession({ suspended: action.type === 'auth/logout/pending' }));
            store.dispatch(analyticsApi.util.resetApiState());
            return result;
        }
        if ((analyticsApi.endpoints.getAnalyticsReport.matchRejected(action) || analyticsApi.endpoints.getAnalyticsMembers.matchRejected(action)) && [401, 403].includes(action.payload?.status)) {
            clear();
            store.dispatch(analyticsAccessDenied(action.payload));
            store.dispatch(analyticsApi.util.getRunningQueriesThunk()).forEach((query) => query.abort());
            store.dispatch(analyticsApi.util.resetApiState());
            return result;
        }
        const type = action.type;
        if (/^market\/(create|update|delete|adminCreate|bulkCreate)\/fulfilled$/.test(type) || analyticsDataChanged.match(action)) {
            tags.add('market'); tags.add('meal');
        }
        if (/^meal\/(create|update|delete|bulkCreate|bulkDelete|adminCreate|votePoll)\/fulfilled$/.test(type)) tags.add('meal');
        if (/^members\/(approveUser|denyUser|updateUser|deleteUser|bulkUpdateStatus)\/fulfilled$/.test(type) || type === 'auth/updateProfile/fulfilled' || analyticsDataChanged.match(action)) {
            tags.add('market'); tags.add('meal'); tags.add('members');
        }
        if (tags.size) {
            clearTimeout(timer);
            timer = setTimeout(() => {
                const invalidated = [...tags].map((id) => id === 'members' ? 'AnalyticsMembers' : { type: 'AnalyticsReport', id });
                tags.clear();
                store.dispatch(analyticsApi.util.invalidateTags(invalidated));
            }, 150);
        }
        return result;
    };
};
