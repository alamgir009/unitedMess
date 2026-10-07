import React, { useMemo } from 'react';
import {
    HiOutlineShoppingBag,
    HiOutlineCurrencyRupee,
    HiOutlineUserGroup,
} from 'react-icons/hi2';
import StatPill from '@/shared/components/ui/StatPill/StatPill';
import { cn } from '@/core/utils/helpers/string.helper';

const COLORS = {
    primary: 'bg-primary/10 text-primary border border-primary/10',
    danger: 'bg-danger-bg text-danger-text border border-danger-border',
    neutral: 'bg-muted text-muted-foreground border border-border',
};

const MarketStatsBar = React.memo(({ totalRecords, totalAmount, uniqueUsers, isAdmin }) => {
    const pills = useMemo(() => {
        const items = [
            {
                icon: HiOutlineShoppingBag,
                label: 'Total Records',
                value: totalRecords,
                color: COLORS.neutral,
            },
            {
                icon: HiOutlineCurrencyRupee,
                label: 'Total Spent',
                value: `\u20B9${totalAmount.toLocaleString('en-IN')}`,
                color: COLORS.danger,
            },
        ];

        if (isAdmin) {
            items.push({
                icon: HiOutlineUserGroup,
                label: 'Members',
                value: uniqueUsers,
                color: COLORS.primary,
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
