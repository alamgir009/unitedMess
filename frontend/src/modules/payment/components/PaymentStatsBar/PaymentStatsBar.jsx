import React, { useMemo } from 'react';
import {
    HiOutlineCurrencyRupee,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineUserGroup,
    HiOutlineReceiptRefund,
} from 'react-icons/hi2';
import StatPill from '@/shared/components/ui/StatPill/StatPill';
import { cn } from '@/core/utils/helpers/string.helper';

const COLORS = {
    primary: 'bg-primary/10 text-primary border border-primary/10',
    success: 'bg-success-bg text-success-text border border-success-border',
    warning: 'bg-warning-bg text-warning-text border border-warning-border',
    info: 'bg-info-bg text-info-text border border-info-border',
    neutral: 'bg-muted text-muted-foreground border border-border',
};

const PaymentStatsBar = React.memo(({ payments = [], isAdmin, totalCount = 0 }) => {
    const stats = useMemo(() => {
        let totalPaid = 0;
        let totalRefunded = 0;
        let pendingCount = 0;
        const userIds = new Set();

        for (let i = 0; i < payments.length; i++) {
            const p = payments[i];
            if (p.status === 'completed') {
                totalPaid += p.amount || 0;
            } else if (p.status === 'refunded') {
                totalRefunded += Math.abs(p.amount || 0);
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
                sublabel: totalCount > payments.length ? `${payments.length} on this page` : undefined,
                value: totalCount || payments.length,
                color: COLORS.neutral,
            },
            {
                icon: HiOutlineCheckCircle,
                label: 'Total Paid',
                sublabel: totalCount > payments.length ? 'This page only' : undefined,
                value: `\u20B9${totalPaid.toLocaleString('en-IN')}`,
                color: COLORS.success,
            },
        ];

        if (totalRefunded > 0) {
            items.push({
                icon: HiOutlineReceiptRefund,
                label: 'Refunded',
                sublabel: totalCount > payments.length ? 'This page only' : undefined,
                value: `\u20B9${totalRefunded.toLocaleString('en-IN')}`,
                color: COLORS.info,
            });
        }

        if (pendingCount > 0) {
            items.push({
                icon: HiOutlineClock,
                label: 'Pending',
                sublabel: totalCount > payments.length ? 'This page only' : undefined,
                value: pendingCount,
                color: COLORS.warning,
            });
        }

        if (isAdmin) {
            items.push({
                icon: HiOutlineUserGroup,
                label: 'Members',
                value: userIds.size,
                color: COLORS.primary,
            });
        }

        return items;
    }, [payments, isAdmin, totalCount]);

    const gridLayoutClass = cn(
        'grid gap-3 sm:gap-4 items-stretch',
        stats.length === 2 && 'grid-cols-2 max-w-2xl',
        stats.length === 3 && 'grid-cols-2 md:grid-cols-3',
        stats.length >= 4 && 'grid-cols-2 lg:grid-cols-4'
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
