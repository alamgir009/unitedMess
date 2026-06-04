import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';

const StatsCard = React.memo(({ title, value, change, changeType, icon: Icon }) => {
  const getBadgeStyle = (title) => {
    const t = String(title || '').toLowerCase();
    if (t.includes('member') || t.includes('user')) {
      return 'bg-primary/10 text-primary border border-primary/10';
    }
    if (t.includes('market') || t.includes('expense')) {
      return 'bg-danger-bg text-danger-text border border-danger-border';
    }
    if (t.includes('meal') && !t.includes('rate')) {
      return 'bg-success-bg text-success-text border border-success-border';
    }
    if (t.includes('rate')) {
      return 'bg-warning-bg text-warning-text border border-warning-border';
    }
    return 'bg-primary/10 text-primary border border-primary/10';
  };

  const badgeCls = getBadgeStyle(title);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-3.5 sm:p-4 md:p-5 lg:p-6 shadow-sm transform-gpu hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md transition-all duration-200 ease-out motion-reduce:hover:translate-y-0 contain-layout group">
      <div className="relative z-10 flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate mb-1" title={title}>
            {title}
          </p>
          <h3 className="text-lg sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl font-bold text-foreground tracking-tight leading-none tabular-nums truncate mb-1.5" title={value}>
            {value}
          </h3>

          {change && (
            <div className="flex items-center text-xs font-semibold mt-1">
              <span className={cn(
                'flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-colors',
                changeType === 'increase'
                  ? 'bg-success-bg text-success-text border-success-border'
                  : 'bg-danger-bg text-danger-text border-danger-border',
              )}>
                {changeType === 'increase' ? <TrendingUp className="mr-0.5 w-3 h-3" /> : <TrendingDown className="mr-0.5 w-3 h-3" />}
                {change}
              </span>
            </div>
          )}
        </div>

        <div className={cn('p-1.5 sm:p-2.5 md:p-3 rounded-lg sm:rounded-lg shrink-0 transition-all duration-200 group-hover:scale-105', badgeCls)}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
});

StatsCard.displayName = 'StatsCard';

export default StatsCard;
