import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiActivity, FiShoppingBag, FiArrowRight, FiInbox,
} from 'react-icons/fi';
import {
    HiOutlineCalendarDays, HiOutlineChevronRight, HiOutlineSun, HiOutlineMoon, HiOutlineSparkles,
} from 'react-icons/hi2';
import { cn } from '@/core/utils/helpers/string.helper';
import { formatActivityTime, formatInIST, isTodayIST, isYesterdayIST } from '@/core/utils/helpers/date.helper';
import { format, differenceInDays } from 'date-fns';

/* ─────────────────────────────────────────────────────────────
   Build human-readable subtitle for activity entries
   ───────────────────────────────────────────────────────────── */
const buildMealSubtitle = (activity) => {
    const parts = [];
    const lower = activity.description?.toLowerCase() || '';

    // Guest count
    const guestMatch = lower.match(/guests?:\s*(\d+)/);
    if (guestMatch) {
        const count = parseInt(guestMatch[1], 10);
        if (count > 0) parts.push(`${count} guest${count > 1 ? 's' : ''}`);
    }

    // Remarks (strip "Note: " prefix)
    const remarkMatch = activity.description?.match(/Note:\s*(.+?)(?:\s*$)/i);
    if (remarkMatch) parts.push(remarkMatch[1]);

    return parts.join(' · ') || 'Auto-created from vote';
};

const buildMarketSubtitle = (activity) => {
    return activity.description || 'Grocery purchase';
};

/* ─────────────────────────────────────────────────────────────
   Group activities by date label
   ───────────────────────────────────────────────────────────── */
const groupActivitiesByDate = (activities) => {
    const groups = [];
    const groupMap = new Map();

    for (const activity of activities) {
        const dateSource = activity.raw?.date || activity.datetime;
        const date = dateSource instanceof Date
            ? dateSource
            : new Date(dateSource);
        if (isNaN(date.getTime())) continue;

        const istDate = new Date(
            date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
        );
        const dateKey = format(istDate, 'yyyy-MM-dd');

        if (!groupMap.has(dateKey)) {
            let label;
            if (isTodayIST(date)) {
                label = `Today, ${formatInIST(date, 'd MMM yyyy')}`;
            } else if (isYesterdayIST(date)) {
                label = `Yesterday, ${formatInIST(date, 'd MMM yyyy')}`;
            } else if (differenceInDays(new Date(), date) < 7) {
                label = formatInIST(date, "EEEE, d MMM yyyy");
            } else {
                label = formatInIST(date, 'EEEE, d MMM yyyy');
            }

            const group = { dateKey, label, items: [] };
            groups.push(group);
            groupMap.set(dateKey, group);
        }

        groupMap.get(dateKey).items.push(activity);
    }

    return groups;
};

/* ─────────────────────────────────────────────────────────────
   Activity Icon — contextual based on raw meal type
   ───────────────────────────────────────────────────────────── */
const MEAL_ICON_CONFIG = {
    day:   { icon: HiOutlineSun,      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/15' },
    night: { icon: HiOutlineMoon,     bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/15' },
    both:  { icon: HiOutlineSparkles, bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/15' },
};
const MEAL_ICON_FALLBACK = { icon: HiOutlineSun, bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/15' };

const ActivityIcon = memo(function ActivityIcon({ type, mealType }) {
    const config = type === 'meal'
        ? (MEAL_ICON_CONFIG[mealType] || MEAL_ICON_FALLBACK)
        : { icon: FiShoppingBag, bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15' };

    const Icon = config.icon;

    return (
        <div className={cn('p-2 rounded-xl shrink-0 border', config.bg)}>
            <Icon size={15} />
        </div>
    );
});

/* ─────────────────────────────────────────────────────────────
   Activity Row
   ───────────────────────────────────────────────────────────── */
const ActivityRow = memo(function ActivityRow({ activity }) {
    const navigate = useNavigate();

    const title = activity.type === 'meal' ? 'Meal Entry' : 'Market Purchase';
    const subtitle = activity.type === 'meal'
        ? buildMealSubtitle(activity)
        : buildMarketSubtitle(activity);

    return (
        <button
            onClick={() => navigate('/meals')}
            className="w-full group flex items-center justify-between px-3 py-3 sm:px-4 sm:py-3.5 hover:bg-muted/30 transition-[background-color] duration-150 ease-out text-left rounded-lg"
        >
            <div className="flex items-center gap-3 min-w-0">
                <ActivityIcon type={activity.type} mealType={activity.raw?.type} />
                <div className="min-w-0">
                    <p className="text-[13px] sm:text-body font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-150">
                        {title}
                    </p>
                    <p className="text-[11px] sm:text-caption text-muted-foreground truncate mt-0.5">
                        {subtitle}
                    </p>
                </div>
            </div>
            <div className="text-right shrink-0 ml-3 flex items-center gap-2">
                <div>
                    <p className="text-[13px] sm:text-body font-bold text-foreground tabular-nums">{activity.amount}</p>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap tabular-nums">
                        {formatActivityTime(activity.datetime)}
                    </p>
                </div>
                <HiOutlineChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </div>
        </button>
    );
});

/* ─────────────────────────────────────────────────────────────
   Date Section Header
   ───────────────────────────────────────────────────────────── */
const DateHeader = memo(function DateHeader({ label }) {
    return (
        <div className="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-1.5">
            <HiOutlineCalendarDays size={13} className="text-muted-foreground/60 shrink-0" />
            <span className="text-[11px] sm:text-caption font-bold text-muted-foreground uppercase tracking-wider">
                {label}
            </span>
        </div>
    );
});

/* ─────────────────────────────────────────────────────────────
   Skeleton Loader
   ───────────────────────────────────────────────────────────── */
const ActivitySkeleton = () => (
    <div className="flex items-center gap-3 p-3 sm:px-4 animate-pulse">
        <div className="w-9 h-9 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-muted rounded" />
            <div className="h-2.5 w-24 bg-muted rounded" />
        </div>
        <div className="space-y-1.5">
            <div className="h-3.5 w-12 bg-muted rounded ml-auto" />
            <div className="h-2.5 w-14 bg-muted rounded ml-auto" />
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────────── */
const RecentActivityWidget = memo(function RecentActivityWidget({ activities = [], isLoading }) {
    const navigate = useNavigate();

    const groupedActivities = useMemo(
        () => groupActivitiesByDate(activities),
        [activities]
    );

    if (isLoading) {
        return (
            <div className="bg-card border border-border/50 rounded-lg shadow-sm p-4 sm:p-5 flex flex-col animate-fade-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-3.5 w-14 bg-muted rounded animate-pulse" />
                </div>
                <div className="space-y-0.5">
                    {[1, 2, 3].map(i => <ActivitySkeleton key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border/50 rounded-lg shadow-sm overflow-hidden animate-fade-up contain-content" style={{ animationDelay: '0.2s' }}>
            {/* Header */}
            <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <h3 className="text-h4 sm:text-h3 font-bold text-foreground flex items-center gap-2">
                        <FiActivity className="text-primary" size={15} />
                        Recent Activity
                    </h3>
                    <button
                        onClick={() => navigate('/meals')}
                        className="flex items-center gap-1 text-[11px] sm:text-caption font-semibold text-primary hover:text-primary/80 transition-colors group"
                    >
                        View All
                        <FiArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Activity List — Date Grouped, Individual Entries */}
            <div className="overflow-y-auto custom-scrollbar max-h-[380px] sm:max-h-[420px]">
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 sm:py-14 gap-3 text-muted-foreground">
                        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                            <FiInbox size={22} className="opacity-40" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-[13px] sm:text-body text-foreground">No activity yet</p>
                            <p className="text-[11px] sm:text-caption mt-0.5">Your meals and market entries will appear here</p>
                        </div>
                        <button
                            onClick={() => navigate('/meals')}
                            className="mt-1 text-[11px] sm:text-caption font-bold text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                        >
                            Log your first meal
                        </button>
                    </div>
                ) : (
                    <div className="py-1">
                        {groupedActivities.map((group) => (
                            <div key={group.dateKey}>
                                <DateHeader label={group.label} />
                                <div className="px-1">
                                    {group.items.map((activity) => (
                                        <ActivityRow key={activity.id} activity={activity} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

export default RecentActivityWidget;
