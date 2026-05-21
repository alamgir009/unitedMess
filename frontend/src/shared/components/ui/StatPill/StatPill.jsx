import React from 'react';

const StatPill = React.memo(({ icon: Icon, label, value, color }) => (
    <div
        className={[
            'flex items-center gap-2.5 sm:gap-3',
            'px-3 py-2.5 sm:px-4 sm:py-3',
            'rounded-xl border',
            'overflow-hidden',
            'transition-colors duration-100',
            'hover:shadow-sm',
            'contain-layout',
            color,
        ].join(' ')}
    >
        <div className="p-1.5 sm:p-2 rounded-lg bg-current/10 flex-shrink-0">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-60 truncate">{label}</p>
            <p className="text-lg sm:text-xl font-bold leading-tight tabular-nums tracking-tight">{value}</p>
        </div>
    </div>
));

StatPill.displayName = 'StatPill';

export default StatPill;
