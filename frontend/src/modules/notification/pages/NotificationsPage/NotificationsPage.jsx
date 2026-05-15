import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Filter, RefreshCw, CheckCircle2 } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import NotificationItem from '../../components/NotificationItem/NotificationItem';
import { Spinner } from '@/shared/components/ui';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';

const FILTER_TABS = ['All', 'Unread', 'Action Required'];

const groupByDate = (notifications) => {
    const todayTs = new Date().setHours(0, 0, 0, 0);
    const yesterdayTs = todayTs - 86400000;
    const groups = new Map();
    for (const n of notifications) {
        const ts = new Date(n.createdAt).setHours(0, 0, 0, 0);
        const key = ts === todayTs
            ? 'Today'
            : ts === yesterdayTs
                ? 'Yesterday'
                : new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(n);
    }
    return groups;
};

const Skeleton = () => (
    <div className="space-y-1.5 p-3" aria-busy="true" aria-label="Loading notifications">
        {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl animate-pulse">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2 py-0.5">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-2/5" />
                </div>
            </div>
        ))}
    </div>
);

const NotificationsPage = () => {
    const [activeFilter, setActiveFilter] = useState('All');
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerRef = useRef(null);

    const {
        items, loading, unreadCount, hasMore,
        total, markAllLoading, error,
        loadMore, markSingleAsRead, markAllAsRead, refresh,
    } = useNotifications({ limit: 20 });

    const filteredItems = items.filter(n => {
        if (activeFilter === 'Unread') return !n.isRead;
        if (activeFilter === 'Action Required') return n.actionRequired;
        return true;
    });

    const handleLoadMore = useCallback(async () => {
        if (!hasMore || isLoadingMore) return;
        setIsLoadingMore(true);
        await loadMore();
        setIsLoadingMore(false);
    }, [hasMore, isLoadingMore, loadMore]);

    const sentinelRef = useCallback(node => {
        if (loading || isLoadingMore) return;
        observerRef.current?.disconnect();
        if (!node) return;
        observerRef.current = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting && hasMore) handleLoadMore(); },
            { threshold: 0.5 },
        );
        observerRef.current.observe(node);
    }, [loading, isLoadingMore, hasMore, handleLoadMore]);

    const handleSelect = useCallback((notification) => {
        const id = notification._id ?? notification.id;
        if (!notification.isRead) markSingleAsRead(id);
    }, [markSingleAsRead]);

    const grouped = groupByDate(filteredItems);
    const groupKeys = [...grouped.keys()];
    const lastGroup = groupKeys.at(-1);

    let itemIndex = 0;

    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Bell className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {total} total &middot; {unreadCount} unread
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={markAllAsRead}
                                disabled={markAllLoading}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                                    text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40
                                    border border-blue-100 dark:border-blue-900/50
                                    hover:bg-blue-100 dark:hover:bg-blue-950/70
                                    disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {markAllLoading
                                    ? <Spinner size="sm" color="current" className="!w-4 !h-4" />
                                    : <CheckCircle2 className="w-4 h-4" />
                                }
                                Mark all read
                            </motion.button>
                        )}
                        <button
                            onClick={refresh}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                                text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800
                                border border-slate-200 dark:border-slate-700
                                hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 mb-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveFilter(tab)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                activeFilter === tab
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {tab}
                            {tab === 'Unread' && unreadCount > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-blue-500 text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    {loading && items.length === 0 ? (
                        <Skeleton />
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <div className="w-14 h-14 rounded-full mb-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-red-400" />
                            </div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Failed to load
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[220px] leading-relaxed mb-3">
                                {error || 'Something went wrong while fetching notifications.'}
                            </p>
                            <button
                                onClick={refresh}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                    text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40
                                    border border-blue-100 dark:border-blue-900/50
                                    hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-all"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Try again
                            </button>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <div className="w-14 h-14 rounded-full mb-4 shadow-inner bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                            </div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {activeFilter === 'All' ? 'All caught up!' : `No ${activeFilter.toLowerCase()} notifications`}
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
                                {activeFilter === 'All'
                                    ? "We'll alert you when something needs attention"
                                    : `Try switching to a different filter`}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100/60 dark:divide-slate-800/40">
                            {groupKeys.map((groupKey) => (
                                <div key={groupKey}>
                                    <div className="px-5 py-2 sticky top-0 z-[1] bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800/60 backdrop-blur-sm">
                                        <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 font-mono">
                                            {groupKey}
                                        </span>
                                    </div>
                                    {grouped.get(groupKey).map((notif, idx) => {
                                        const notifId = notif._id ?? notif.id;
                                        const isLast = groupKey === lastGroup && idx === grouped.get(groupKey).length - 1;
                                        const delay = itemIndex++;
                                        return (
                                            <motion.div
                                                key={notifId}
                                                custom={delay}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: delay * 0.03, type: 'spring', stiffness: 400, damping: 28 }}
                                                ref={isLast ? sentinelRef : null}
                                            >
                                                <NotificationItem notification={notif} onSelect={handleSelect} />
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ))}
                            {isLoadingMore && (
                                <div className="flex items-center justify-center gap-2 py-5">
                                    <Spinner size="sm" color="current" className="text-blue-500" />
                                    <span className="text-xs text-slate-400 font-mono">Loading more&hellip;</span>
                                </div>
                            )}
                            {!hasMore && items.length >= 20 && (
                                <p className="py-6 text-center text-[11px] font-mono text-slate-400 dark:text-slate-500">
                                    &mdash; {total} notifications total &mdash;
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default NotificationsPage;
