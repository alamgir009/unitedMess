import React from 'react';
import {
    HiOutlineShoppingBag,
    HiOutlineCurrencyRupee,
    HiOutlineUserGroup,
} from 'react-icons/hi2';

const PILL_STYLES = {
    primary: 'bg-primary-500/10 border-primary-500/20 text-primary-600 dark:text-primary-400',
    secondary: 'bg-secondary-500/10 border-secondary-500/20 text-secondary-600 dark:text-secondary-400',
    amber: 'bg-amber-400/10 border-amber-400/20 text-amber-500 dark:text-amber-400',
};

const StatPill = ({ icon: Icon, label, value, colorKey, fullWidth = false }) => (
    <div
        className={[
            'flex items-center gap-3 px-4 py-3 rounded-2xl border',
            'shadow-sm hover:shadow-md',
            fullWidth ? 'col-span-2' : '',
            PILL_STYLES[colorKey],
        ].join(' ')}
    >
        <div className="p-2 rounded-xl bg-white/10 flex-shrink-0">
            <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
            <p className="text-xs font-medium opacity-60 leading-none truncate">{label}</p>
            <p className="text-xl font-black leading-tight tabular-nums">{value}</p>
        </div>
    </div>
);

//   MarketStatsBar
const MarketStatsBar = ({ totalRecords, totalAmount, uniqueUsers, isAdmin }) => {
    const pills = [
        {
            icon: HiOutlineShoppingBag,
            label: 'Total Records',
            value: totalRecords,
            colorKey: 'primary',
        },
        {
            icon: HiOutlineCurrencyRupee,
            label: 'Total Spent',
            value: `₹${totalAmount.toLocaleString('en-IN')}`,
            colorKey: 'secondary',
        },
        ...(isAdmin
            ? [{ icon: HiOutlineUserGroup, label: 'Members', value: uniqueUsers, colorKey: 'amber' }]
            : []),
    ];

    return (
        <div className={`grid grid-cols-2 gap-3 ${isAdmin ? 'md:grid-cols-3 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
            {pills.map((p, i) => (
                <StatPill
                    key={p.label}
                    {...p}
                    fullWidth={isAdmin && i === pills.length - 1 && pills.length % 2 !== 0}
                />
            ))}
        </div>
    );
};

export default MarketStatsBar;