import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, RefreshCw, CheckCircle2, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useSelector } from 'react-redux';
import useNotifications from '../../hooks/useNotifications';
import NotificationItem from '../../components/NotificationItem/NotificationItem';
import NotificationService from '../../services/notification.service';
import { Spinner, Button } from '@/shared/components/ui';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import toast from 'react-hot-toast';

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
                <div className="shrink-0 w-10 h-10 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2 py-0.5">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-2.5 bg-muted rounded w-2/5" />
                </div>
            </div>
        ))}
    </div>
);

const AdminComposeCard = ({ onSent }) => {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;
        setSubmitting(true);
        try {
            await NotificationService.sendAdminNotification({
                targetType: 'ALL',
                title: title.trim(),
                message: message.trim(),
                type: 'CUSTOM',
                priority: 'NORMAL',
            });
            toast.success('Notification sent to all users');
            setTitle('');
            setMessage('');
            onSent?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send notification');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    Send Notification to All Users
                </span>
                {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="compose-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3 border-t border-border pt-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-muted-foreground">Title</label>
                                    <span className="text-caption text-muted-foreground">{title.length}/80</span>
                                </div>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                                    maxLength={80}
                                    placeholder="Notification title"
                                    required
                                    className="w-full input-base"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-muted-foreground">Message</label>
                                    <span className="text-caption text-muted-foreground">{message.length}/300</span>
                                </div>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                                    maxLength={300}
                                    rows={3}
                                    placeholder="Notification message"
                                    required
                                    className="w-full input-base resize-none"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                fullWidth
                                disabled={submitting || !title.trim() || !message.trim()}
                                isLoading={submitting}
                            >
                                {!submitting && <Send className="w-4 h-4" />}
                                {submitting ? 'Sending...' : 'Send to All Users'}
                            </Button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const NotificationsPage = () => {
    const [activeFilter, setActiveFilter] = useState('All');
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerRef = useRef(null);

    const { user } = useSelector((state) => state.auth);
    const isAdmin = user?.role === 'admin';

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
            <div className="-mx-4 sm:mx-0 h-full flex flex-col pt-4 sm:pt-6">
                {/* Fixed top section */}
                <div className="shrink-0 px-4 sm:px-6 lg:px-8 space-y-4 mb-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                <Bell className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-h1">Notifications</h1>
                                <p className="text-body text-muted-foreground">
                                    {total} total &middot; {unreadCount} unread
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <Button
                                variant="neutral"
                                size="sm"
                                onClick={refresh}
                                disabled={loading}
                                aria-label="Refresh notifications"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                            {unreadCount > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.85 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={markAllAsRead}
                                    disabled={markAllLoading}
                                    className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-sm font-medium
                                        text-primary bg-primary/10 border border-primary/20
                                        hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {markAllLoading
                                        ? <Spinner size="sm" color="current" className="!w-4 !h-4" />
                                        : <CheckCircle2 className="w-4 h-4" />
                                    }
                                    <span className="hidden sm:inline">Mark all read</span>
                                </motion.button>
                            )}
                        </div>
                    </div>

                    {/* Admin Compose Card */}
                    {isAdmin && (
                        <AdminComposeCard onSent={refresh} />
                    )}

                    {/* Filter Tabs */}
                    <div className="overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit">
                            {FILTER_TABS.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveFilter(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                        activeFilter === tab
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {tab}
                                    {tab === 'Unread' && unreadCount > 0 && (
                                        <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Scrollable list — edge-to-edge on mobile */}
                <div className="flex-1 overflow-y-auto min-h-0 sm:px-6 lg:px-8 pb-4 sm:pb-6">
                    <div className="bg-card border border-border shadow-sm overflow-hidden rounded-none sm:rounded-2xl">
                        {loading && items.length === 0 ? (
                            <Skeleton />
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-10 md:py-20 px-6 text-center">
                                <div className="w-14 h-14 rounded-full mb-4 bg-destructive/10 flex items-center justify-center">
                                    <Bell className="w-5 h-5 text-destructive" />
                                </div>
                                <h4 className="text-sm font-semibold text-foreground mb-1">
                                    Failed to load
                                </h4>
                                <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed mb-3">
                                    {error || 'Something went wrong while fetching notifications.'}
                                </p>
                                <Button
                                    variant="neutral"
                                    size="sm"
                                    onClick={refresh}
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Try again
                                </Button>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 md:py-20 px-6 text-center">
                                <div className="w-14 h-14 rounded-full mb-4 bg-muted/50 flex items-center justify-center">
                                    <Bell className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <h4 className="text-sm font-semibold text-foreground mb-1">
                                    {activeFilter === 'All' ? 'All caught up!' : `No ${activeFilter.toLowerCase()} notifications`}
                                </h4>
                                <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
                                    {activeFilter === 'All'
                                        ? "We'll alert you when something needs attention"
                                        : `Try switching to a different filter`}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/60">
                                {groupKeys.map((groupKey) => (
                                    <div key={groupKey}>
                                        <div className="px-5 py-2 sticky top-0 z-[1] bg-muted/90 border-b border-border/60 backdrop-blur-sm">
                                            <span className="text-caption font-semibold tracking-widest uppercase text-muted-foreground">
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
                                                    <div className="active:scale-[0.98] sm:active:scale-100 transition-transform">
                                                        <NotificationItem notification={notif} onSelect={handleSelect} />
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ))}
                                {isLoadingMore && (
                                    <div className="flex items-center justify-center gap-2 py-5">
                                        <Spinner size="sm" color="current" className="text-primary" />
                                        <span className="text-xs text-muted-foreground">Loading more&hellip;</span>
                                    </div>
                                )}
                                {!hasMore && items.length >= 20 && (
                                    <p className="py-6 text-center text-caption text-muted-foreground">
                                        &mdash; {total} notifications total &mdash;
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default NotificationsPage;
