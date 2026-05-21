import React from 'react';
import { cn } from '@/core/utils/helpers/string.helper';

const StatPill = React.memo(({ icon: Icon, label, value, color }) => (
    <div
        className={cn(
            'flex items-center gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5',
            'rounded-xl border border-border/50',
            'bg-card text-card-foreground',
            'shadow-sm overflow-hidden min-w-0',
            'transition-all duration-200 ease-out',
            'transform-gpu hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
            'motion-reduce:hover:translate-y-0',
            'contain-layout'
        )}
    >
        <div className={cn(
            'p-2 rounded-xl flex-shrink-0 flex items-center justify-center transition-colors duration-200',
            color
        )}>
            <Icon className="w-4.5 h-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate mb-0.5">
                {label}
            </p>
            <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-none tabular-nums truncate">
                {value}
            </p>
        </div>
    </div>
));

StatPill.displayName = 'StatPill';

export default StatPill;
