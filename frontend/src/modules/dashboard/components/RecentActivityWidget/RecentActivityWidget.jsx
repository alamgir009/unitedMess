import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiActivity, FiCoffee, FiShoppingBag, FiArrowRight, FiInbox } from 'react-icons/fi';
import { cn } from '@/core/utils/helpers/string.helper';
import { format, isToday, isYesterday } from 'date-fns';

const formatActivityDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
        if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
        return format(date, 'MMM d, yyyy');
    } catch {
        return '';
    }
};

const ActivitySkeleton = () => (
    <div className="flex items-center gap-4 p-3 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-3.5 w-36 bg-gray-100 dark:bg-slate-800 rounded" />
            <div className="h-2.5 w-24 bg-gray-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-4 w-16 bg-gray-100 dark:bg-slate-800 rounded shrink-0" />
    </div>
);

const RecentActivityWidget = ({ activities = [], isLoading }) => {
    const navigate = useNavigate();
    const hasMeals = activities.some(a => a.type === 'meal');

    if (isLoading) {
        return (
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-800 shadow-sm p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-5">
                    <div className="h-5 w-32 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-4 w-14 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="space-y-1 divide-y divide-gray-50 dark:divide-slate-800/50">
                    {[1, 2, 3, 4].map(i => <ActivitySkeleton key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                    <FiActivity className="text-indigo-500" size={16} />
                    Recent Activity
                </h3>
                <button
                    onClick={() => navigate(hasMeals ? '/meals' : '/markets')}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group"
                >
                    View All
                    <FiArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/40 custom-scrollbar">
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 gap-3 text-gray-400 dark:text-gray-500">
                        <FiInbox size={36} className="opacity-30" />
                        <div className="text-center">
                            <p className="font-semibold text-sm">No activity yet</p>
                            <p className="text-xs mt-0.5">Your meals and market entries will appear here</p>
                        </div>
                        <button
                            onClick={() => navigate('/meals')}
                            className="mt-2 text-xs font-bold text-indigo-500 hover:text-indigo-600 underline underline-offset-2"
                        >
                            Log your first meal
                        </button>
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div
                            key={activity.id}
                            className="group flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-default"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className={cn(
                                    'p-2.5 rounded-xl shrink-0 shadow-sm',
                                    activity.type === 'meal'
                                        ? 'bg-orange-50 text-orange-500 dark:bg-orange-900/20 dark:text-orange-400'
                                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                )}>
                                    {activity.type === 'meal'
                                        ? <FiCoffee size={16} />
                                        : <FiShoppingBag size={16} />
                                    }
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {activity.title}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                        {activity.description}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{activity.amount}</p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">
                                    {formatActivityDate(activity.datetime)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer linked to relevant page */}
            {activities.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-50 dark:border-slate-800/50 bg-gray-50/50 dark:bg-slate-800/20">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        Showing last {activities.length} activities · Meals & Market entries
                    </p>
                </div>
            )}
        </div>
    );
};

export default RecentActivityWidget;
