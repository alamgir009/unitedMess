import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineXMark,
    HiOutlineDocumentText,
    HiOutlineExclamationTriangle,
    HiOutlineCurrencyRupee,
    HiOutlineArrowPath,
    HiOutlineClock,
} from 'react-icons/hi2';

import MessBillInvoice from '../MessBillInvoice/MessBillInvoice';
import { fetchMonthlyInvoice, clearMonthlyInvoice } from '../../store/invoice.slice';
import { fmt } from '@/core/utils/helpers/currency.helper';

/* ─────────────────────────────────────────────────────────
   Status translator:
   Invoice model  →  MessBillInvoice prop
     'paid'           → 'success'
     'partially_paid' → 'partially_paid'
     'unpaid'         → 'pending'
   Fallback:        → 'pending'
───────────────────────────────────────────────────────── */
const toPaymentStatus = (invoiceStatus) => {
    switch (invoiceStatus) {
        case 'paid':           return 'success';
        case 'partially_paid': return 'partially_paid';
        case 'unpaid':
        default:               return 'pending';
    }
};

/* ─────────────────────────────────────────────────────────
   Adapter: raw Invoice DB document → MessBillInvoice props
───────────────────────────────────────────────────────── */
const toInvoiceDisplayData = (invoice) => {
    if (!invoice) return null;
    return {
        grandTotalMarketAmount: invoice.marketAmountSpent  ?? 0,
        grandTotalMeal:         invoice.mealCount          ?? 0,
        totalGuestRevenue:      invoice.guestMealRevenue   ?? 0,
        adjustedMealCharge:     invoice.messCost           ?? 0,
        payableAmount:          invoice.totalPayable       ?? 0,
        monthName:              invoice.monthName,
        userStats: {
            totalMeal:           invoice.mealCount          ?? 0,
            totalMarketAmount:   invoice.marketAmountSpent  ?? 0,
            waterBill:           invoice.fixedCosts?.waterBill      ?? 0,
            cookingCharge:       invoice.fixedCosts?.cookingCharge  ?? 0,
            costOfMeals:         invoice.messCost            ?? 0,
            guestMeal:           invoice.guestMealCount      ?? 0,
            chargePerGuestMeal:  60,
            guestMealAmount:     invoice.guestMealRevenue    ?? 0,
            gasBillCharge:       invoice.fixedCosts?.gasBillCharge  ?? 0,
        },
        platformFee: invoice.fixedCosts?.platformFee ?? 0,
    };
};

/* ─────────────────────────────────────────────────────────
   Skeleton loader
───────────────────────────────────────────────────────── */
const InvoiceSkeleton = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full" />
        <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full" />
        <div className="h-56 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full" />
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full" />
    </div>
);

/* ─────────────────────────────────────────────────────────
   Partial Payment Reminder Banner
───────────────────────────────────────────────────────── */
const PartialPaymentBanner = ({ remainingAmount, paidAmount, totalPayable, onPayNow, isPaying, monthName }) => {
    const paidPercent = totalPayable > 0
        ? Math.min(100, Math.round((paidAmount / totalPayable) * 100))
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/15 overflow-hidden"
        >
            {/* Progress bar */}
            <div className="h-1.5 bg-amber-100 dark:bg-amber-900/30 w-full">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${paidPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                />
            </div>

            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <HiOutlineClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                            Partial Payment Received — Balance Due
                        </p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5 leading-relaxed">
                            You've paid <span className="font-semibold">₹{fmt(paidAmount)}</span> ({paidPercent}%) of
                            your total bill of <span className="font-semibold">₹{fmt(totalPayable)}</span>.
                            Please pay the remaining{' '}
                            <span className="font-bold text-amber-800 dark:text-amber-300">
                                ₹{fmt(remainingAmount)}
                            </span>{' '}
                            to clear your balance.
                        </p>
                    </div>
                </div>

                {onPayNow && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={!!isPaying}
                        onClick={() => onPayNow(monthName)}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
                            bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold
                            shadow-[0_4px_14px_rgba(245,158,11,0.4)]
                            hover:shadow-[0_6px_20px_rgba(245,158,11,0.5)]
                            disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {isPaying ? (
                            <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                        ) : (
                            <HiOutlineCurrencyRupee className="w-4 h-4" />
                        )}
                        <span>{isPaying ? 'Processing…' : `Pay Remaining ₹${fmt(remainingAmount)}`}</span>
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
};

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
const MonthlyInvoiceModal = ({
    isOpen,
    onClose,
    year,
    month,
    monthName,
    onPayNow,    // optional: if provided, show "Pay Remaining" in the partial-payment banner
    isPaying,    // optional: loading state for onPayNow
    paymentRecord: externalPaymentRecord, // optional: UPI manual payment info from payment card
}) => {
    const dispatch = useDispatch();
    const { monthlyInvoice, isLoadingMonthly, error } = useSelector((state) => state.invoice);
    const { user } = useSelector((state) => state.auth);

    /* ── Fetch + cleanup ───────────────────────── */
    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleEsc);

        if (year && month) {
            dispatch(fetchMonthlyInvoice({ year, month }));
        }

        return () => {
            document.body.style.overflow = 'unset';
            document.removeEventListener('keydown', handleEsc);
            dispatch(clearMonthlyInvoice());
        };
    }, [isOpen, year, month, dispatch, onClose]);

    /* Stable close handler */
    const handleClose = useCallback(() => onClose(), [onClose]);

    if (!isOpen) return null;

    /* ── Derived values ────────────────────────── */
    const displayData      = toInvoiceDisplayData(monthlyInvoice);
    const invoiceStatus    = monthlyInvoice?.status ?? 'unpaid';
    const paymentStatus    = toPaymentStatus(invoiceStatus);
    const isFinalized      = monthlyInvoice?.isFinalized ?? false;
    const isPartiallyPaid  = invoiceStatus === 'partially_paid';
    const paidAmount       = monthlyInvoice?.paidAmount    ?? 0;
    const totalPayable     = monthlyInvoice?.totalPayable  ?? 0;
    const remainingAmount  = monthlyInvoice?.remainingAmount
        ?? Math.max(0, totalPayable - paidAmount);

    // Merge external payment record (e.g. from UPI manual payment) into the invoice payment record
    const invoicePaymentRecord = {
        month:       monthlyInvoice?.monthName,
        paymentDate: monthlyInvoice?.createdAt,
        paidAmount,
        totalPayable,
        remainingAmount,
        ...(externalPaymentRecord || {}),
    };

    /* ── Render ────────────────────────────────── */
    return (
        <AnimatePresence>
            <motion.div
                key="monthly-invoice-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                    onClick={handleClose}
                    aria-hidden="true"
                />

                {/* Modal container */}
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Invoice Details"
                >
                    {/* ── Header ─────────────────────────────────── */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                                <HiOutlineDocumentText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Invoice Details
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {monthName || monthlyInvoice?.monthName || ''}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Status chip */}
                            {!isLoadingMonthly && monthlyInvoice && (
                                <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    invoiceStatus === 'paid'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : invoiceStatus === 'partially_paid'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                    {invoiceStatus === 'paid'
                                        ? '✓ Paid'
                                        : invoiceStatus === 'partially_paid'
                                            ? '⏳ Partially Paid'
                                            : isFinalized ? 'Finalized' : 'Unpaid'}
                                </span>
                            )}

                            <button
                                id="monthly-invoice-modal-close"
                                onClick={handleClose}
                                className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Close invoice modal"
                            >
                                <HiOutlineXMark className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ── Scrollable body ────────────────────────── */}
                    <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 custom-scrollbar bg-gray-50/50 dark:bg-slate-900">

                        {/* Loading state */}
                        {isLoadingMonthly && <InvoiceSkeleton />}

                        {/* Error state */}
                        {!isLoadingMonthly && error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-6 text-center bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900"
                            >
                                <HiOutlineExclamationTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                                <p className="font-semibold text-red-600 dark:text-red-400 mb-1">
                                    Failed to load invoice
                                </p>
                                <p className="text-sm text-red-500/80 dark:text-red-400/70">{error}</p>
                                <button
                                    onClick={() => dispatch(fetchMonthlyInvoice({ year, month }))}
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                >
                                    <HiOutlineArrowPath className="w-4 h-4" />
                                    Try Again
                                </button>
                            </motion.div>
                        )}

                        {/* Invoice content */}
                        {!isLoadingMonthly && !error && displayData && (
                            <>
                                {/* ★ PARTIAL PAYMENT REMINDER BANNER ★ */}
                                {isPartiallyPaid && (
                                    <PartialPaymentBanner
                                        remainingAmount={remainingAmount}
                                        paidAmount={paidAmount}
                                        totalPayable={totalPayable}
                                        onPayNow={onPayNow}
                                        isPaying={isPaying}
                                        monthName={monthlyInvoice?.monthName || monthName}
                                    />
                                )}

                                {/* Invoice body */}
                                <MessBillInvoice
                                    data={displayData}
                                    user={user}
                                    platformFee={displayData.platformFee}
                                    paymentStatus={paymentStatus}
                                    paymentRecord={invoicePaymentRecord}
                                    onPayNow={!isPartiallyPaid && paymentStatus !== 'success' ? onPayNow : undefined}
                                    isPaying={isPaying}
                                />
                            </>
                        )}

                        {/* Empty state (no data, no error, not loading) */}
                        {!isLoadingMonthly && !error && !displayData && (
                            <div className="py-16 text-center">
                                <HiOutlineDocumentText className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    No invoice data found for this period.
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MonthlyInvoiceModal;
