import React from 'react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { cn } from '@/core/utils/helpers/string.helper';

const StatsCard = React.memo(({ title, value, change, changeType, icon: Icon }) => {
    // Dynamic mapping for clean, flat HSL badges
    const getBadgeStyle = (title) => {
        const t = String(title || '').toLowerCase();
        if (t.includes('member') || t.includes('user')) {
            return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/10';
        }
        if (t.includes('market') || t.includes('expense')) {
            return 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/10';
        }
        if (t.includes('meal') && !t.includes('rate')) {
            return 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/10';
        }
        if (t.includes('rate')) {
            return 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/10';
        }
        return 'bg-primary/10 text-primary border border-primary/10';
    };

    const badgeCls = getBadgeStyle(title);

    return (
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-3.5 sm:p-4 md:p-5 lg:p-6 shadow-sm transform-gpu hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md transition-all duration-200 ease-out motion-reduce:hover:translate-y-0 contain-layout group">
            <div className="relative z-10 flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate mb-1" title={title}>{title}</p>
                    <h3 className="text-lg sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl font-extrabold text-foreground tracking-tight leading-none tabular-nums truncate mb-1.5" title={value}>{value}</h3>
                    
                    {change && (
                        <div className="flex items-center text-xs font-semibold mt-1">
                            <span className={cn(
                                "flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-colors",
                                changeType === 'increase' 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25" 
                                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/25"
                             )}>
                                {changeType === 'increase' ? <FiTrendingUp className="mr-0.5" /> : <FiTrendingDown className="mr-0.5" />}
                                {change}
                            </span>
                        </div>
                    )}
                </div>
                
                <div className={cn("p-1.5 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl shrink-0 transition-all duration-200 group-hover:scale-105", badgeCls)}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-5.5 md:w-5.5" />
                </div>
            </div>
        </div>
    );
});

StatsCard.displayName = 'StatsCard';

export default StatsCard;
