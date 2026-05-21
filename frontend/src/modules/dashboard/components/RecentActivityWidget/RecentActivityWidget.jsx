import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiActivity, FiCoffee, FiShoppingBag, FiArrowRight, FiInbox } from 'react-icons/fi';
import { cn } from '@/core/utils/helpers/string.helper';
import { formatActivityDate } from '@/core/utils/helpers/date.helper';

const ActivitySkeleton = () => (
    <div className="flex items-center gap-4 p-3 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-3.5 w-36 bg-muted rounded" />
            <div className="h-2.5 w-24 bg-muted rounded" />
        </div>
        <div className="h-4 w-16 bg-muted rounded shrink-0" />
    </div>
);

const ActivityIcon = memo(function ActivityIcon({ type }) {
    return (
        <div className={cn(
            'p-2 rounded-xl shrink-0 border',
            type === 'meal'
                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/10'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10'
        )}>
            {type === 'meal'
                ? <FiCoffee size={15} />
                : <FiShoppingBag size={15} />
            }
        </div>
    );
});

const ActivityRow = memo(function ActivityRow({ activity }) {
    return (
        <div className="group flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors duration-150 cursor-default">
            <div className="flex items-center gap-3.5 min-w-0">
                <ActivityIcon type={activity.type} />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-150">
                        {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {activity.description}
                    </p>
                </div>
            </div>
            <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold text-foreground tabular-nums">{activity.amount}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                    {formatActivityDate(activity.datetime)}
                </p>
            </div>
        </div>
    );
});

const RecentActivityWidget = memo(function RecentActivityWidget({ activities = [], isLoading }) {
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-5">
                    <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-14 bg-muted rounded animate-pulse" />
                </div>
                <div className="space-y-1 divide-y divide-border/20">
                    {[1, 2, 3, 4].map(i => <ActivitySkeleton key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border/50 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <FiActivity className="text-primary" size={16} />
                    Recent Activity
                </h3>
                <button
                    onClick={() => navigate('/meals')}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group"
                >
                    View All
                    <FiArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/20 custom-scrollbar">
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
                        <FiInbox size={36} className="opacity-30" />
                        <div className="text-center">
                            <p className="font-semibold text-sm text-foreground">No activity yet</p>
                            <p className="text-xs mt-0.5">Your meals and market entries will appear here</p>
                        </div>
                        <button
                            onClick={() => navigate('/meals')}
                            className="mt-2 text-xs font-bold text-primary hover:text-primary/80 underline underline-offset-2"
                        >
                            Log your first meal
                        </button>
                    </div>
                ) : (
                    activities.map((activity) => (
                        <ActivityRow key={activity.id} activity={activity} />
                    ))
                )}
            </div>

            {activities.length > 0 && (
                <div className="px-6 py-3 border-t border-border/40 bg-muted/20">
                    <p className="text-[10px] text-muted-foreground">
                        Showing last {activities.length} activities · Meals & Market entries
                    </p>
                </div>
            )}
        </div>
    );
});

export default RecentActivityWidget;
