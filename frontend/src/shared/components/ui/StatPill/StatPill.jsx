import React from 'react';
import { cn } from '@/core/utils/helpers/string.helper';

const StatPill = React.memo(({ icon: Icon, label, value, color, trend, compact }) => (
  <div
    className={cn(
      'flex items-center gap-3 rounded-lg border border-border',
      'bg-card text-card-foreground',
      'shadow-sm overflow-hidden min-w-0',
      'transition-all duration-[var(--duration-base)] ease-out',
      'transform-gpu hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
      'motion-reduce:hover:translate-y-0',
      'contain-layout',
      compact ? 'px-2.5 py-2' : 'px-3.5 py-3 sm:px-4 sm:py-3.5',
    )}
  >
    <div className={cn(
      'flex-shrink-0 flex items-center justify-center transition-colors duration-[var(--duration-base)]',
      compact ? 'p-1.5 rounded-md' : 'p-2 rounded-lg',
      color,
    )}>
      <Icon className={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} aria-hidden="true" />
    </div>
    <div className="min-w-0 flex-1">
      <p className={cn(
        'font-semibold uppercase tracking-wider text-muted-foreground truncate mb-0.5',
        compact ? 'text-[10px]' : 'text-xs',
      )}>
        {label}
      </p>
      <div className="flex items-center gap-2">
        <p className={cn(
          'font-bold tracking-tight text-foreground leading-none tabular-nums truncate',
          compact ? 'text-base' : 'text-lg sm:text-xl',
        )}>
          {value}
        </p>
        {trend && (
          <span className={cn(
            'text-xs font-semibold flex items-center gap-0.5',
            trend.direction === 'up' ? 'text-profit' : trend.direction === 'down' ? 'text-loss' : 'text-neutral',
          )}>
            {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '―'}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  </div>
));

StatPill.displayName = 'StatPill';

export default StatPill;
