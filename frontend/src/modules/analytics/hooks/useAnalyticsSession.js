import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { reportingWindowChanged } from '../store/analytics.slice';

export const getISTWindowKey = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', timeZone: 'Asia/Kolkata' }).formatToParts(date);
    return `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}`;
};
export function useAnalyticsIdentity() {
    const user = useSelector((state) => state.auth.user);
    const epoch = useSelector((state) => state.analyticsUi.epoch);
    const suspended = useSelector((state) => state.analyticsUi.suspended);
    const accessError = useSelector((state) => state.analyticsUi.accessError);
    return { viewerId: user?._id || user?.id, epoch, enabled: Boolean(user?.role === 'admin' && user?.userStatus === 'approved' && user?.isActive !== false && !suspended && !accessError) };
}
export default function useAnalyticsSession() {
    const dispatch = useDispatch();
    const identity = useAnalyticsIdentity();
    const ui = useSelector((state) => state.analyticsUi);
    const [windowKey, setWindowKey] = useState(getISTWindowKey);
    useEffect(() => {
        const update = () => setWindowKey(getISTWindowKey());
        const timer = setInterval(update, 30000);
        window.addEventListener('focus', update);
        return () => { clearInterval(timer); window.removeEventListener('focus', update); };
    }, []);
    useEffect(() => { dispatch(reportingWindowChanged(windowKey)); }, [dispatch, windowKey]);
    return {
        ui, ...identity, windowKey,
    };
}
