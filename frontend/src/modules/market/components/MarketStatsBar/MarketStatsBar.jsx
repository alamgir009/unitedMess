import React, { useMemo } from 'react';
import {
    HiOutlineShoppingBag,
    HiOutlineCurrencyRupee,
    HiOutlineUserGroup,
} from 'react-icons/hi2';
import StatPill from '@/shared/components/ui/StatPill/StatPill';

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

    return (
        <div
            role="status"
            aria-label="Market statistics"
            className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4"
        >
            {pills.map((p) => (
                <StatPill key={p.label} {...p} />
            ))}
        </div>
    );
});

MarketStatsBar.displayName = 'MarketStatsBar';

export default MarketStatsBar;
