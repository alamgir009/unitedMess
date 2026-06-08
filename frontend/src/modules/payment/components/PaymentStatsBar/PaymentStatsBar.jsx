import React, { useMemo } from 'react';
import {
    HiOutlineCurrencyRupee,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineUserGroup,
} from 'react-icons/hi2';
import StatPill from '@/shared/components/ui/StatPill/StatPill';
import { cn } from '@/core/utils/helpers/string.helper';

const COLORS = {
    primary: 'bg-primary/10 border-primary/20 text-primary',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    secondary: 'bg-secondary-500/10 border-secondary-500/20 text-secondary-600 dark:text-secondary-400',
};

const PaymentStatsBar = React.memo(({ payments = [], isAdmin, totalCount = 0 }) => {
    const stats = useMemo(() => {
        let totalPaid = 0;
        let pendingCount = 0;
        const userIds = new Set();

        for (let i = 0; i < payments.length; i++) {
            const p = payments[i];
            if (p.status === 'completed') {
                totalPaid += p.amount || 0;
            } else if (p.status === 'pending' || p.status === 'pending_verification') {
                pendingCount += 1;
            }
            if (isAdmin) {
                const uid = typeof p.user === 'object' ? p.user?._id : p.user;
                if (uid) userIds.add(uid);
            }
        }

        const items = [
            {
                icon: HiOutlineCurrencyRupee,
                label: 'Total Records',
                value: totalCount || payments.length,
                color: COLORS.primary,
            },
            {
                icon: HiOutlineCheckCircle,
                label: 'Total Paid',
                value: `\u20B9${totalPaid.toLocaleString('en-IN')}`,
                color: COLORS.emerald,
            },
        ];

        if (pendingCount > 0) {
            items.push({
                icon: HiOutlineClock,
                label: 'Pending',
                value: pendingCount,
                color: COLORS.amber,
            });
        }

        if (isAdmin) {
            items.push({
                icon: HiOutlineUserGroup,
                label: 'Members',
                value: userIds.size,
                color: COLORS.secondary,
            });
        }

        return items;
    }, [payments, isAdmin, totalCount]);

    const gridLayoutClass = cn(
        'grid gap-3 sm:gap-4',
        stats.length === 2 && 'grid-cols-2 max-w-2xl',
        stats.length === 3 && 'grid-cols-2 md:grid-cols-3',
        stats.length === 4 && 'grid-cols-2 lg:grid-cols-4'
    );

    return (
        <div
            role="status"
            aria-label="Payment statistics"
            className={gridLayoutClass}
        >
            {stats.map((s, idx) => {
                const isLastAndOdd = stats.length === 3 && idx === 2;
                return (
                    <div
                        key={s.label}
                        className={isLastAndOdd ? 'col-span-2 md:col-span-1' : 'col-span-1'}
                    >
                        <StatPill {...s} />
                    </div>
                );
            })}
        </div>
    );
});

PaymentStatsBar.displayName = 'PaymentStatsBar';

export default PaymentStatsBar;
