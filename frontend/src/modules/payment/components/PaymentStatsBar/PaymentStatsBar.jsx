import React from 'react';
import {
    HiOutlineCurrencyRupee,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineUserGroup,
} from 'react-icons/hi2';

const StatPill = React.memo(({ icon: Icon, label, value, color }) => (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm overflow-hidden ${color}`}>
        <div className="p-2 rounded-lg bg-white/10 flex-shrink-0">
            <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
            <p className="text-xs font-medium opacity-70 leading-none truncate">{label}</p>
            <p className="text-lg font-semibold leading-tight tabular-nums">{value}</p>
        </div>
    </div>
));
StatPill.displayName = 'StatPill';

const PaymentStatsBar = ({ payments = [], isAdmin }) => {
    const totalPaid    = payments.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
    const totalRecords = payments.length;
    const pendingCount = payments.filter(p => p.status === 'pending').length;
    const uniqueUsers  = isAdmin
        ? new Set(payments.map(p => (typeof p.user === 'object' ? p.user?._id : p.user))).size
        : 0;

    const stats = [
        {
            icon:  HiOutlineCurrencyRupee,
            label: 'Total Records',
            value: totalRecords,
            color: 'bg-primary/10 border-primary/20 text-primary',
        },
        {
            icon:  HiOutlineCheckCircle,
            label: 'Total Paid',
            value: `₹${totalPaid.toLocaleString('en-IN')}`,
            color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
        },
        ...(pendingCount > 0
            ? [{
                icon:  HiOutlineClock,
                label: 'Pending',
                value: pendingCount,
                color: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
              }]
            : []),
        ...(isAdmin
            ? [{
                icon:  HiOutlineUserGroup,
                label: 'Members',
                value: uniqueUsers,
                color: 'bg-secondary-400/10 border-secondary-400/20 text-secondary-400',
              }]
            : []),
    ];

    return (
        <div className={`grid grid-cols-2 gap-3 ${isAdmin ? 'md:grid-cols-3 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
            {stats.map((s) => (
                <StatPill key={s.label} {...s} />
            ))}
        </div>
    );
};

export default PaymentStatsBar;
