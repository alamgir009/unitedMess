import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    BellRing, CheckCircle2, Loader2, RefreshCw, Sparkles, Bell, AlertCircle
} from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import NotificationItem from '../NotificationItem/NotificationItem';
import { cn } from '@/core/utils/helpers/string.helper';
import { Spinner } from '@/shared/components/ui';

// ─── Animation variants ───────────────────────────────────────────────────────
const LIST_ITEM = {
    hidden:  { opacity: 0, y: 6  },
    visible: (i) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.04, type: 'spring', stiffness: 400, damping: 28 },
    }),
    exit:    { opacity: 0, y: 4, transition: { duration: 0.12 } },
};

// ─── Date grouping ────────────────────────────────────────────────────────────
const groupByDate = (notifications) => {
    const todayTs     = new Date().setHours(0, 0, 0, 0);
    const yesterdayTs = todayTs - 86_400_000;
    const groups      = new Map();

    for (const n of notifications) {
        const ts  = new Date(n.createdAt).setHours(0, 0, 0, 0);
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = () => (
    <div className="space-y-1.5 p-3" aria-busy="true" aria-label="Loading notifications">
        {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl animate-pulse">
                <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2 py-0.5">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3   bg-slate-200 dark:bg-slate-700 rounded w-full" />
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-2/5" />
                </div>
            </div>
        ))}
    </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ hasUnread }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0  }}
        className="flex flex-col items-center justify-center py-14 px-6 text-center"
    >
        <div className="
            w-14 h-14 rounded-full mb-4 shadow-inner
            bg-gradient-to-br from-slate-100 to-slate-200
            dark:from-slate-800 dark:to-slate-700
            flex items-center justify-center
        ">
            {hasUnread
                ? <BellRing  className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                : <Sparkles  className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            }
        </div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {hasUnread ? 'No unread notifications' : 'All caught up!'}
        </h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[180px] leading-relaxed">
            {hasUnread
                ? "You've read everything"
                : "We'll alert you when something needs attention"
            }
        </p>
    </motion.div>
);

// ─── Error state ──────────────────────────────────────────────────────────────
const ErrorState = ({ error, onRetry }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0  }}
        className="flex flex-col items-center justify-center py-14 px-6 text-center"
    >
        <div className="
            w-14 h-14 rounded-full mb-4 shadow-inner
            bg-gradient-to-br from-red-50 to-red-100
            dark:from-red-900/20 dark:to-red-800/30
            flex items-center justify-center
        ">
            <AlertCircle className="w-5 h-5 text-red-400 dark:text-red-400" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Failed to load
        </h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[220px] leading-relaxed mb-3">
            {error || 'Something went wrong while fetching notifications.'}
        </p>
        <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40
                border border-blue-100 dark:border-blue-900/50
                hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-all"
        >
            <RefreshCw className="w-3 h-3" />
            Try again
        </button>
    </motion.div>
);

// ─── Group label ──────────────────────────────────────────────────────────────
const GroupLabel = ({ label }) => (
    <div className="
        px-4 py-2 sticky top-0 z-[1]
        bg-slate-50/90 dark:bg-slate-800/80
        border-b border-slate-100 dark:border-slate-800/60
        backdrop-blur-sm
    ">
        <span className="text-[10px] font-semibold tracking-widest uppercase
            text-slate-400 dark:text-slate-500 font-mono">
            {label}
        </span>
    </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const NotificationList = ({ closeMenu, onNotificationClick }) => {
    const {
        items, loading, unreadCount, hasMore,
        currentPage, total, markAllLoading,
        loadMore, markSingleAsRead, markAllAsRead, refresh,
    } = useNotifications({ limit: 20 });

    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerRef                        = useRef(null);

    // Infinite scroll
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

    // Handlers
    const handleSelect = useCallback(async (notification) => {
        const id = notification._id ?? notification.id;
        if (!notification.isRead) await markSingleAsRead(id);
        closeMenu();
        onNotificationClick?.(notification);
    }, [closeMenu, markSingleAsRead, onNotificationClick]);

    const handleMarkAllAsRead = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        markAllAsRead();
    }, [markAllAsRead]);

    const handleRefresh = useCallback(() => {
        refresh();
    }, [refresh]);

    const grouped    = groupByDate(items);
    const groupKeys  = [...grouped.keys()];
    const lastGroup  = groupKeys.at(-1);

    let itemIndex = 0; // for stagger delay

    return (
        <div className="flex flex-col h-full max-h-[75vh] sm:max-h-[600px]
            bg-white dark:bg-slate-900 overflow-hidden shadow-inner">

            {/* ── Header ── */}
            <div className="
                sticky top-0 z-10 shrink-0
                flex items-center justify-between
                px-5 py-4
                border-b border-slate-100 dark:border-slate-800
                bg-white/90 dark:bg-slate-900/90
                backdrop-blur-sm
            ">
                <div className="flex items-center gap-2.5">
                    <div className="
                        w-9 h-9 rounded-2xl shadow-lg
                        bg-gradient-to-br from-blue-500 to-indigo-600
                        flex items-center justify-center
                    ">
                        <Bell className="w-4 h-4 md:w-5 md:h-5 lg:w-5 lg:h-5 text-white" aria-hidden />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-[15px] tracking-tight">
                            Notifications
                        </h3>
                        {total > 0 && (
                            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                                {total} total · {unreadCount} new
                            </p>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.button
                            key="mark-all"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1    }}
                            exit={{   opacity: 0, scale: 0.85  }}
                            onClick={handleMarkAllAsRead}
                            disabled={markAllLoading}
                            aria-label="Mark all notifications as read"
                            className="
                                flex items-center gap-1.5 px-2.5 py-1.5
                                rounded-lg text-xs font-medium
                                text-blue-600 dark:text-blue-400
                                bg-blue-50 dark:bg-blue-950/40
                                border border-blue-100 dark:border-blue-900/50
                                hover:bg-blue-100 dark:hover:bg-blue-950/70
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-150
                            "
                        >
                            {markAllLoading
                                ? <Spinner size="sm" color="current" className="!w-3.5 !h-3.5" aria-hidden />
                                : <CheckCircle2 className="w-3.5 h-3.5"             aria-hidden />
                            }
                            Mark all read
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Body ── */}
            <div
                role="list"
                aria-label="Notification items"
                aria-live="polite"
                className="overflow-y-auto flex-1 overscroll-contain
                    scrollbar-thin scrollbar-track-transparent
                    scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700
                    hover:scrollbar-thumb-slate-300 dark:hover:scrollbar-thumb-slate-600"
            >
                {loading && items.length === 0 ? (
                    <Skeleton />
                ) : error ? (
                    <ErrorState error={error} onRetry={handleRefresh} />
                ) : items.length === 0 ? (
                    <EmptyState hasUnread={unreadCount > 0} />
                ) : (
                    <div className="divide-y divide-slate-100/60 dark:divide-slate-800/40 py-1">
                        {groupKeys.map(groupKey => (
                            <div key={groupKey}>
                                <GroupLabel label={groupKey} />
                                <AnimatePresence initial={false}>
                                    {grouped.get(groupKey).map((notif, idx) => {
                                        const notifId = notif._id ?? notif.id;
                                        const isLast  = groupKey === lastGroup &&
                                            idx === grouped.get(groupKey).length - 1;
                                        const delay   = itemIndex++;

                                        return (
                                            <motion.div
                                                key={notifId}
                                                custom={delay}
                                                variants={LIST_ITEM}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                ref={isLast ? sentinelRef : null}
                                            >
                                                <NotificationItem
                                                    notification={notif}
                                                    onSelect={handleSelect}
                                                />
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        ))}

                        {/* Infinite scroll states */}
                        {isLoadingMore && (
                            <div className="flex items-center justify-center gap-2 py-5">
                                <Spinner size="sm" color="current" className="text-blue-500" />
                                <span className="text-xs text-slate-400 font-mono">Loading more…</span>
                            </div>
                        )}

                        {!hasMore && items.length >= 20 && (
                            <p className="py-6 text-center text-[11px] font-mono text-slate-400 dark:text-slate-500">
                                — {total} notifications total —
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            {items.length > 0 && (
                <div className="
                    shrink-0 px-5 py-4
                    border-t border-slate-100 dark:border-slate-800
                    bg-slate-50/50 dark:bg-slate-800/20
                    flex items-center justify-between
                ">
                    <motion.button
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleRefresh}
                        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider
                            text-slate-400 dark:text-slate-500 hover:text-blue-500
                            dark:hover:text-blue-400 transition-all"
                        aria-label="Refresh notifications"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} aria-hidden />
                        Refresh
                    </motion.button>

                    <button
                        onClick={closeMenu}
                        className="text-[11px] font-bold uppercase tracking-wider
                            text-slate-400 dark:text-slate-500 hover:text-slate-700
                            dark:hover:text-slate-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationList;