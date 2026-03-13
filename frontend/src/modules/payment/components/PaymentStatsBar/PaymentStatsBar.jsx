import React from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineCurrencyRupee,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineUserGroup,
} from 'react-icons/hi2';

const StatPill = ({ icon: Icon, label, value, color, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay, duration: 0.35 }}
        className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${color}`}
    >
        <div className="relative z-10 flex items-center gap-3 w-full">
            <div className="p-2 rounded-xl bg-white/20 dark:bg-white/10 flex-shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium opacity-70 leading-none truncate">{label}</p>
                <p className="text-xl font-black leading-tight tabular-nums">{value}</p>
            </div>
        </div>
        {/* Premium gloss */}
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent pointer-events-none" />
        <div className="absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-black/5 to-transparent pointer-events-none" />
    </motion.div>
);

/**
 * PaymentStatsBar — summary stat pills
 */
const PaymentStatsBar = ({ payments = [], isAdmin }) => {
    const totalPaid    = payments.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
    const totalRecords = payments.length;
    const pendingCount = payments.filter(p => p.status === 'pending').length;
    const uniqueUsers  = isAdmin
        ? new Set(payments.map(p => (typeof p.user === 'object' ? p.user?._id : p.user))).size
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap"
        >
            <StatPill delay={0.09} icon={HiOutlineCurrencyRupee} label="Total Records"
                value={totalRecords}
                color="bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400"
            />
            <StatPill delay={0.14} icon={HiOutlineCheckCircle} label="Total Paid"
                value={`₹${totalPaid.toLocaleString('en-IN')}`}
                color="bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
            />
            {pendingCount > 0 && (
                <StatPill delay={0.19} icon={HiOutlineClock} label="Pending"
                    value={pendingCount}
                    color="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                />
            )}
            {isAdmin && (
                <StatPill delay={0.24} icon={HiOutlineUserGroup} label="Members"
                    value={uniqueUsers}
                    color="bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-400"
                />
            )}
        </motion.div>
    );
};

export default PaymentStatsBar;
