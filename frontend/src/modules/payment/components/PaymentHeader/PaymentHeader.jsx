import React from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlinePlus,
    HiOutlineSquares2X2,
    HiOutlineListBullet,
    HiOutlineCurrencyRupee,
    HiOutlineShieldCheck,
    HiOutlineCheckCircle,
} from 'react-icons/hi2';
import { SiRazorpay } from "react-icons/si";

/**
 * PaymentHeader
 * Title, role badge, always-visible view toggle, payable amount UI, and Action buttons.
 */
const PaymentHeader = ({ isAdmin, viewMode, onViewModeChange, onAddClick, payableGasBill, gasBillStatus = 'pending', onPayNowClick, isPaying }) => {
    // Determine the safe numeric value of payable gas bill
    const gasBillVal = typeof payableGasBill === 'number'
        ? payableGasBill
        : typeof payableGasBill === 'object' && payableGasBill !== null
            ? (payableGasBill.payableAmount || payableGasBill.amount || 0)
            : 0;

    const gasBillPaid = gasBillStatus === 'success';

    return (
        <motion.div
            initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-5"
    >
        {/* ── Left ── */}
        <div className="space-y-1">
            {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-bold bg-secondary-400/10 text-secondary-400 border border-secondary-400/20">
                    <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                    Admin View
                </span>
            ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    <HiOutlineCurrencyRupee className="w-3.5 h-3.5" />
                    My Payments
                </span>
            )}
            <h2 className="text-3xl sm:text-4xl tracking-tight text-foreground">
                {isAdmin ? 'Payment Overview' : 'Payment Hub'}
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
                {isAdmin
                    ? 'Monitor and manage all payment records across all members.'
                    : 'Track your mess bills, gas bills, and other payments.'}
            </p>
        </div>

        {/* ── Right: controls & payments ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0">

            {/* Gas Bill Banner — three states: paid, pending (with amount), hidden */}
            {gasBillPaid ? (
                /* ── Gas bill already paid: green badge ── */
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 shadow-sm">
                    <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Gas Bill</span>
                        <span className="text-sm font-bold leading-none">Paid ✓</span>
                    </div>
                </div>
            ) : gasBillVal > 0 ? (
                /* ── Gas bill pending: amber pay banner ── */
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-sm">
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Gas Bill</span>
                        <span className="text-xl font-black leading-none tracking-tight">₹{gasBillVal.toLocaleString('en-IN')}</span>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        disabled={isPaying}
                        onClick={() => onPayNowClick(gasBillVal, 'gas_bill')}
                        className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-lg bg-[#02042B] border border-[#3395FF]/30 hover:border-[#3395FF] hover:shadow-[#3395FF]/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isPaying === 'gas_bill' ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <SiRazorpay className="w-3.5 h-3.5 text-[#3395FF]" />
                        )}
                        <span>Pay Now</span>
                    </motion.button>
                </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
                {/* Add Entry button — admin only */}
                {isAdmin && (
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={onAddClick}
                        aria-label="Record payment"
                        className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-sm font-bold text-white relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300
                            before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:via-white/10 before:to-transparent
                            after:absolute after:top-0 after:inset-x-4 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/80 after:to-transparent"
                        style={{ background: 'linear-gradient(135deg, hsl(245,76%,60%) 0%, hsl(270,76%,46%) 100%)' }}
                    >
                        <HiOutlinePlus className="w-4 h-4 relative flex-shrink-0" />
                        <span className="relative hidden sm:inline">Add Payment</span>
                    </motion.button>
                )}

                {/* View toggle — visible on ALL screen sizes */}
                <div className="flex items-center p-1 rounded-xl bg-muted/30 border border-white/10 dark:border-white/5 shadow-lg">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        title="Grid view" aria-label="Grid view"
                        className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <HiOutlineSquares2X2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        title="List view" aria-label="List view"
                        className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <HiOutlineListBullet className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    </motion.div>
    );
};

export default PaymentHeader;
