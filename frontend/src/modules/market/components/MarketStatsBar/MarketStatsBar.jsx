import React, { useMemo } from 'react';
import {
    HiOutlineShoppingBag,
    HiOutlineCurrencyRupee,
    HiOutlineUserGroup,
} from 'react-icons/hi2';
import StatPill from '@/shared/components/ui/StatPill/StatPill';
import { cn } from '@/core/utils/helpers/string.helper';

const COLORS = {
    primary: 'bg-primary/10 border-primary/20 text-primary',
    secondary: 'bg-secondary-500/10 border-secondary-500/20 text-secondary-600 dark:text-secondary-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
};

const MarketStatsBar = React.memo(({ totalRecords, totalAmount, uniqueUsers, isAdmin }) => {
    const pills = useMemo(() => {
        const items = [
            {
                icon: HiOutlineShoppingBag,
                label: 'Total Records',
                value: totalRecords,
                color: COLORS.primary,
            },
            {
                icon: HiOutlineCurrencyRupee,
                label: 'Total Spent',
                value: `\u20B9${totalAmount.toLocaleString('en-IN')}`,
                color: COLORS.secondary,
            },
        ];

        if (isAdmin) {
            items.push({
                icon: HiOutlineUserGroup,
                label: 'Members',
                value: uniqueUsers,
                color: COLORS.amber,
            });
        }

        return items;
    }, [totalRecords, totalAmount, uniqueUsers, isAdmin]);

    const gridLayoutClass = cn(
        'grid gap-3 sm:gap-4',
        pills.length === 2 && 'grid-cols-2 max-w-2xl',
        pills.length === 3 && 'grid-cols-2 md:grid-cols-3'
    );

    return (
        <div
            role="status"
            aria-label="Market statistics"
            className={gridLayoutClass}
        >
            {pills.map((p, idx) => {
                const isLastAndOdd = pills.length === 3 && idx === 2;
                return (
                    <div
                        key={p.label}
                        className={isLastAndOdd ? 'col-span-2 md:col-span-1' : 'col-span-1'}
                    >
                        <StatPill {...p} />
                    </div>
                );
            })}
        </div>
    );
});

MarketStatsBar.displayName = 'MarketStatsBar';

export default MarketStatsBar;
