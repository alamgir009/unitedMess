import React from 'react';
import { Spinner } from '@/shared/components/ui';
import { motion } from 'framer-motion';
import {
    HiOutlinePlus,
    HiOutlineSquares2X2,
    HiOutlineListBullet,
    HiOutlineCurrencyRupee,
    HiOutlineShieldCheck,
    HiOutlineCheckCircle,
    HiOutlineBoltSlash,
} from 'react-icons/hi2';


/* ─── Tiny icon-only toggle button ─── */
const ViewBtn = ({ active, onClick, label, children }) => (
    <button
        onClick={onClick}
        title={label}
        aria-label={label}
        aria-pressed={active}
        className={`relative p-2 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
            active
                ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-slate-800/60'
        }`}
    >
        {children}
    </button>
);

/**
 * PaymentHeader — fintech-grade two-zone layout
 *
 * LEFT  : role chip → page title → subtitle
 * RIGHT : gas bill status widget → Add button (admin) → grid/list toggle
 */
const PaymentHeader = ({
    isAdmin,
    viewMode,
    onViewModeChange,
    onAddClick,
    payableGasBill,
    gasBillStatus = 'pending',
    onPayNowClick,
    isPaying,
}) => {
    const gasBillVal =
        typeof payableGasBill === 'number'
            ? payableGasBill
            : typeof payableGasBill === 'object' && payableGasBill !== null
            ? payableGasBill.payableAmount ?? payableGasBill.amount ?? 0
            : 0;

    const gasBillPaid = gasBillStatus === 'success';

    return (
        <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
            {/* ── LEFT: identity ── */}
            <div className="flex flex-col gap-1.5 min-w-0">
                {/* Role chip */}
                <div className="flex items-center gap-2">
                    <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase border ${
                            isAdmin
                                ? 'bg-violet-500/10 text-violet-500 border-violet-500/20'
                                : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                        }`}
                    >
                        {isAdmin ? (
                            <HiOutlineShieldCheck className="w-3 h-3" />
                        ) : (
                            <HiOutlineCurrencyRupee className="w-3 h-3" />
                        )}
                        {isAdmin ? 'Admin View' : 'My Payments'}
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-none">
                    {isAdmin ? 'Payment Overview' : 'Payment Hub'}
                </h1>

                {/* Subtitle */}
                <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-md">
                    {isAdmin
                        ? 'Monitor and manage all payment records across members.'
                        : 'Track your mess bills, gas bills, and other payments.'}
                </p>
            </div>

            {/* ── RIGHT: widgets + controls ── */}
            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">

                {/* Gas Bill Widget */}
                {gasBillPaid ? (
                    /* ── Paid: compact green chip ── */
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    >
                        <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <div className="leading-none">
                            <p className="text-[9px] uppercase font-bold tracking-widest opacity-70">Gas Bill</p>
                            <p className="text-sm font-bold mt-0.5">Paid ✓</p>
                        </div>
                    </motion.div>
                ) : gasBillVal > 0 ? (
                    /* ── Pending: amber widget with pay button ── */
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 shadow-sm"
                    >
                        <div className="leading-none">
                            <p className="text-[9px] uppercase font-bold tracking-widest opacity-70">Gas Bill</p>
                            <p className="text-lg font-black tabular-nums mt-0.5 leading-none">
                                ₹{gasBillVal.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={isPaying}
                            onClick={() => onPayNowClick(gasBillVal, 'gas_bill')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-lg
                                bg-[#02042B] border border-[#3395FF]/30 hover:border-[#3395FF]/70 hover:shadow-[#3395FF]/20
                                transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isPaying ? (
                                <Spinner size="sm" color="white" className="!w-3 !h-3 !border-[2px]" />
                            ) : null}
                            Pay
                        </motion.button>
                    </motion.div>
                ) : null}

                {/* Separator line on desktop when gas widget is present */}
                {(gasBillPaid || gasBillVal > 0) && (
                    <div className="hidden sm:block w-px h-8 bg-border/60" />
                )}

                {/* Add Payment — admin only */}
                {isAdmin && (
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onAddClick}
                        aria-label="Record payment"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-white
                            shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden
                            before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/25 before:to-transparent
                            after:absolute after:top-0 after:inset-x-6 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent"
                        style={{ background: 'linear-gradient(135deg, hsl(245,76%,60%) 0%, hsl(270,76%,48%) 100%)' }}
                    >
                        <HiOutlinePlus className="w-4 h-4 relative" />
                        <span className="relative hidden sm:inline">Add Payment</span>
                    </motion.button>
                )}

                {/* Grid / List toggle */}
                <div className="flex items-center gap-0.5 p-1 rounded-xl bg-muted/40 border border-white/10 dark:border-white/5 shadow-inner">
                    <ViewBtn
                        active={viewMode === 'grid'}
                        onClick={() => onViewModeChange('grid')}
                        label="Grid view"
                    >
                        <HiOutlineSquares2X2 className="w-4 h-4" />
                    </ViewBtn>
                    <ViewBtn
                        active={viewMode === 'list'}
                        onClick={() => onViewModeChange('list')}
                        label="List view"
                    >
                        <HiOutlineListBullet className="w-4 h-4" />
                    </ViewBtn>
                </div>
            </div>
        </motion.div>
    );
};

export default PaymentHeader;
