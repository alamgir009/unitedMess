import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, markAsRead, markAllAsRead } from '../store/notification.slice';

const useNotifications = ({ limit = 20, autoFetch = true } = {}) => {
    const dispatch = useDispatch();
    const hasFetched = useRef(false);
    const {
        items,
        unreadCount,
        pagination,
        loading,
        error,
        markAllLoading,
        lastRealtimeUpdate,
    } = useSelector((state) => state.notification);

    const fetch = useCallback((page = 1) => {
        dispatch(fetchNotifications({ page, limit }));
    }, [dispatch, limit]);

    useEffect(() => {
        if (autoFetch && !hasFetched.current && items.length === 0) {
            hasFetched.current = true;
            fetch(1);
        }
    }, [autoFetch, fetch, items.length]);

    const loadMore = useCallback(() => {
        if (pagination.page < pagination.pages) {
            dispatch(fetchNotifications({ page: pagination.page + 1, limit }));
        }
    }, [dispatch, pagination.page, pagination.pages, limit]);

    const markSingleAsRead = useCallback((id) => {
        dispatch(markAsRead(id));
    }, [dispatch]);

    const markAllAsReadCallback = useCallback(() => {
        dispatch(markAllAsRead());
    }, [dispatch]);

    const refresh = useCallback(() => {
        hasFetched.current = true;
        fetch(1);
    }, [fetch]);

    const hasMore = pagination.page < pagination.pages;

    return {
        items,
        unreadCount,
        loading,
        error,
        markAllLoading,
        lastRealtimeUpdate,
        hasMore,
        total: pagination.total,
        currentPage: pagination.page,
        pages: pagination.pages,
        fetch,
        loadMore,
        markSingleAsRead,
        markAllAsRead: markAllAsReadCallback,
        refresh,
    };
};

export default useNotifications;
