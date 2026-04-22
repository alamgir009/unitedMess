import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlineDocumentText } from 'react-icons/hi2';

import MessBillInvoice from '../MessBillInvoice/MessBillInvoice';
import { fetchMonthlyInvoice, clearMonthlyInvoice } from '../../store/invoice.slice';

/**
 * Adapter function to transform the raw backend Invoice DB document into the expected format
 * for the MessBillInvoice component.
 */
const toInvoiceDisplayData = (invoice) => {
    if (!invoice) return null;
    return {
        grandTotalMarketAmount: invoice.marketAmountSpent,
        grandTotalMeal: invoice.mealCount,
        totalGuestRevenue: invoice.guestMealRevenue,
        adjustedMealCharge: invoice.messCost,
        payableAmount: invoice.totalPayable,
        userStats: {
            totalMeal: invoice.mealCount,
            totalMarketAmount: invoice.marketAmountSpent,
            waterBill: invoice.fixedCosts?.waterBill || 0,
            cookingCharge: invoice.fixedCosts?.cookingCharge || 0,
            costOfMeals: invoice.messCost,
            guestMeal: invoice.guestMealCount,
            chargePerGuestMeal: 60, // Fallback if missing
            guestMealAmount: invoice.guestMealRevenue,
            gasBillCharge: invoice.fixedCosts?.gasBillCharge || 0,
        },
        platformFee: invoice.fixedCosts?.platformFee || 0,
    };
};

const MonthlyInvoiceModal = ({ isOpen, onClose, year, month, monthName }) => {
    const dispatch = useDispatch();
    const { monthlyInvoice, isLoadingMonthly, error } = useSelector((state) => state.invoice);
    const { user } = useSelector((state) => state.auth);

    // Escape listener and body scroll lock
    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleEsc);
        
        // Fetch invoice
        if (year && month) {
            dispatch(fetchMonthlyInvoice({ year, month }));
        }

        return () => {
            document.body.style.overflow = 'unset';
            document.removeEventListener('keydown', handleEsc);
            // Clear on unmount/close to prevent stale data briefly showing next time
            dispatch(clearMonthlyInvoice());
        };
    }, [isOpen, year, month, dispatch, onClose]);

    if (!isOpen) return null;

    const displayData = toInvoiceDisplayData(monthlyInvoice);
    const isFinalized = monthlyInvoice?.isFinalized;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            >
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
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
                                    {monthName || (monthlyInvoice ? monthlyInvoice.monthName : '')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isFinalized && (
                                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    Finalized ✓
                                </span>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <HiOutlineXMark className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="overflow-y-auto w-full p-4 sm:p-6 custom-scrollbar bg-gray-50/50 dark:bg-slate-900">
                        {isLoadingMonthly || !monthlyInvoice ? (
                            <div className="w-full space-y-4 animate-pulse">
                                <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full" />
                                <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full" />
                            </div>
                        ) : error ? (
                            <div className="p-6 text-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900">
                                <p className="font-semibold mb-1">Failed to load invoice</p>
                                <p className="text-sm opacity-80">{error}</p>
                            </div>
                        ) : displayData ? (
                            <div className="space-y-4">
                                {monthlyInvoice.dueCarryOver > 0 && (
                                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-400">
                                        <p className="text-sm font-semibold">Carry-over Balance</p>
                                        <p className="text-xs opacity-90 mt-1">
                                            This invoice includes a carried over due of ₹{monthlyInvoice.dueCarryOver.toLocaleString('en-IN')} from previous months.
                                        </p>
                                    </div>
                                )}
                                <MessBillInvoice 
                                    data={displayData} 
                                    user={user}
                                    platformFee={displayData.platformFee}
                                    paymentStatus={monthlyInvoice.status}
                                    paymentRecord={{
                                        month: monthlyInvoice.monthName,
                                        paymentDate: monthlyInvoice.createdAt // Used for display date primarily
                                    }}
                                    // For historical modals, we usually don't allow Pay Now directly from here, 
                                    // or we only show status. MessBillInvoice uses paymentStatus.
                                />
                            </div>
                        ) : null}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MonthlyInvoiceModal;
