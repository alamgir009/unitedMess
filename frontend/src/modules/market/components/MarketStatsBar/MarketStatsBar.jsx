import React from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineShoppingBag,
    HiOutlineCurrencyDollar,
    HiOutlineUserGroup,
} from 'react-icons/hi2';

/* ── Single animated stat pill ── */
const StatPill = ({ icon: Icon, label, value, color, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay, duration: 0.35 }}
        className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${color}`}
    >
        <div className="relative z-10 flex items-center gap-3 w-full">
            <div className="p-2 rounded-xl bg-white/10 flex-shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium opacity-70 leading-none truncate">{label}</p>
                <p className="text-xl font-black leading-tight tabular-nums">{value}</p>
            </div>
        </div>
        {/* Top gloss line */}
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent pointer-events-none" />
        {/* Bottom shadow line */}
        <div className="absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-black/5 to-transparent pointer-events-none" />
    </motion.div>
);

/**
 * MarketStatsBar
 * Displays summary stat pills: total records, total spent (₹), and members (admin only).
 */
const MarketStatsBar = ({ totalRecords, totalAmount, uniqueUsers, isAdmin }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap"
    >
        <StatPill
            delay={0.10}
            icon={HiOutlineShoppingBag}
            label="Total Records"
            value={totalRecords}
            color="bg-primary-500/10 border-primary-500/20 text-primary-600 dark:text-primary-400"
        />
        <StatPill
            delay={0.15}
            icon={HiOutlineCurrencyDollar}
            label="Total Spent"
            value={`₹${totalAmount.toLocaleString('en-IN')}`}
            color="bg-secondary-500/10 border-secondary-500/20 text-secondary-600 dark:text-secondary-400"
        />
        {isAdmin && (
            <StatPill
                delay={0.20}
                icon={HiOutlineUserGroup}
                label="Members"
                value={uniqueUsers}
                color="bg-amber-400/10 border-amber-400/20 text-amber-400"
            />
        )}
    </motion.div>
);

export default MarketStatsBar;
