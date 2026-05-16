import React from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineCurrencyRupee,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineUserGroup,
} from 'react-icons/hi2';

/* ─── Single stat cell ─── */
const StatCell = ({ icon: Icon, label, value, accentClass, delay = 0, shimmer = false, fullWidth = false }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border overflow-hidden
            shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${accentClass}
            ${fullWidth ? 'col-span-2 md:col-span-1' : ''}
            ${shimmer ? 'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/25 before:to-transparent before:animate-shimmer' : ''}`}
    >
        {/* Shimmer top line */}
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent pointer-events-none" />

        {/* Icon container */}
        <div className="w-9 h-9 rounded-xl bg-current/10 flex items-center justify-center flex-shrink-0 opacity-100">
            <Icon className="w-4 h-4" />
        </div>

        {/* Text */}
        <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 leading-none truncate">
                {label}
            </p>
            <p className="text-xl font-black tabular-nums leading-tight mt-0.5 truncate">
                {value}
            </p>
        </div>
    </motion.div>
);

/**
 * PaymentStatsBar — uniform grid of summary stat pills.
 */
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
            accent: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400',
            delay: 0.08,
            shimmer: true,
        },
        {
            icon:  HiOutlineCheckCircle,
            label: 'Total Paid',
            value: `₹${totalPaid.toLocaleString('en-IN')}`,
            accent: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
            delay: 0.13,
        },
        ...(pendingCount > 0
            ? [{
                icon:  HiOutlineClock,
                label: 'Pending',
                value: pendingCount,
                accent: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
                delay: 0.18,
              }]
            : []),
        ...(isAdmin
            ? [{
                icon:  HiOutlineUserGroup,
                label: 'Members',
                value: uniqueUsers,
                accent: 'bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-400',
                delay: 0.23,
              }]
            : []),
    ];

    return (
        <div className={`grid gap-3 grid-cols-2 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            {stats.map((s, i) => (
                <StatCell
                    key={s.label}
                    icon={s.icon}
                    label={s.label}
                    value={s.value}
                    accentClass={s.accent}
                    delay={s.delay}
                    shimmer={s.shimmer}
                    fullWidth={i === stats.length - 1}
                />
            ))}
        </div>
    );
};

export default PaymentStatsBar;
