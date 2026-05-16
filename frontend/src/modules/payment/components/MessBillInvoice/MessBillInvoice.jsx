import React, { useState, useEffect, useMemo, memo, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import PrintInvoice from './PrintInvoice';
import { useDownloadInvoice } from './useDownloadInvoice';
import invoiceService from '../../services/invoice.service';
import {
    HiOutlineCurrencyRupee,
    HiOutlineShoppingCart,
    HiOutlineUserGroup,
    HiOutlineWrenchScrewdriver,
    HiOutlineBeaker,
    HiOutlineUsers,
    HiOutlineStar,
    HiOutlinePencilSquare,
    HiOutlineLockClosed,
    HiOutlineCheckCircle,
    HiOutlineXMark,
    HiOutlineArrowTrendingDown,
    HiOutlineReceiptPercent,
    HiOutlineDocumentText,
    HiOutlineEnvelope,
    HiOutlineSparkles,
    HiOutlineBuildingOffice2,
    HiOutlineClock,
    HiOutlineArrowDownTray,
} from 'react-icons/hi2';
import { SiRazorpay } from 'react-icons/si';
import { Spinner } from '@/shared/components/ui';

/* ────────────────────────────────────────
   HELPERS (unchanged)
──────────────────────────────────────── */
const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const nowDate = new Date();
const INV_MONTH = nowDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
const INV_DATE = nowDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const INV_NO = `UM-${nowDate.getFullYear()}${String(nowDate.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;

/* ────────────────────────────────────────
   STAT CARD – memoized
──────────────────────────────────────── */
const StatCard = memo(({ icon: Icon, label, value, subLabel, accent = false }) => (
    <div className="flex-1 min-w-[140px] p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${accent ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <Icon className={`w-5 h-5 ${accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`} />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`text-2xl font-bold tabular-nums leading-tight ${accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                    {value}
                </p>
                {subLabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subLabel}</p>}
            </div>
        </div>
    </div>
));

/* ────────────────────────────────────────
   LINE ITEM – memoized
──────────────────────────────────────── */
const LineItem = memo(({ icon: Icon, label, value, subText, accent = false }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${accent ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                <Icon className={`w-4 h-4 ${accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
            </div>
            <div>
                <p className={`text-sm font-medium ${accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                    {label}
                </p>
                {subText && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subText}</p>}
            </div>
        </div>
        <span className={`text-sm font-bold tabular-nums ${accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
            {value}
        </span>
    </div>
));

/* ────────────────────────────────────────
   SECTION DIVIDER – memoized
──────────────────────────────────────── */
const SectionDivider = memo(({ label }) => (
    <div className="flex items-center gap-3 pt-4 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {label}
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
));

/* ────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────── */
const MessBillInvoice = ({
    data,
    isAdmin,
    user,
    platformFee = 0,
    onPlatformFeeChange,
    onPayNow,
    isPaying,
    isSendingEmail,
    onSendEmail,
    paymentStatus = 'pending',   // 'pending' | 'success' | 'partially_paid' | 'failed' | 'refunded'
    paymentRecord,
}) => {
    if (!data) return null;

    const displayMonth = useMemo(() => {
        return paymentRecord?.month || data?.monthName || INV_MONTH;
    }, [paymentRecord, data]);

    const displayDate = useMemo(() => {
        if (paymentRecord?.paymentDate) {
            return new Date(paymentRecord.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return INV_DATE;
    }, [paymentRecord]);

    const {
        grandTotalMarketAmount = 0,
        grandTotalMeal = 0,
        totalGuestRevenue = 0,
        adjustedMealCharge = 0,
        dueCarryOver = 0,
        userStats = {},
    } = data;

    const {
        totalMeal = 0,
        totalMarketAmount = 0,
        waterBill = 0,
        cookingCharge = 0,
        costOfMeals = 0,
        guestMeal = 0,
        chargePerGuestMeal = 0,
        guestMealAmount = 0,
    } = userStats;

    // Memoized derived values
    const basePayable = data.payableAmount ?? 0;
    const finalPayable = basePayable; // Natively included by backend calculation
    const isRefund = useMemo(() => finalPayable < 0, [finalPayable]);
    const displayAmt = useMemo(() => Math.abs(finalPayable), [finalPayable]);
    const isPaid = useMemo(() => paymentStatus === 'success', [paymentStatus]);
    const isPartiallyPaid = useMemo(() => paymentStatus === 'partially_paid', [paymentStatus]);

    const invoiceRef = useRef(null);
    const printRef = useRef(null);
    const { isDownloading, downloadPDF, generatePDFBase64 } = useDownloadInvoice();
    const [sendingEmail, setSendingEmail] = useState(false);

    const handleDownloadPDF = () => {
        downloadPDF({
            printRef,
            fileName: INV_NO,
            title: `Invoice ${INV_NO}`,
            subject: `Mess Bill - ${displayMonth}`
        });
    };

    // Partial payment info from paymentRecord
    const paidAmount      = paymentRecord?.paidAmount      ?? 0;
    const totalPayable    = paymentRecord?.totalPayable    ?? finalPayable;
    const remainingAmount = paymentRecord?.remainingAmount ?? Math.max(0, totalPayable - paidAmount);
    const paidPercent     = totalPayable > 0 ? Math.min(100, Math.round((paidAmount / totalPayable) * 100)) : 0;

    // Safe action handlers
    const handlePayNow = () => {
        if (typeof onPayNow === 'function') {
            onPayNow(finalPayable, 'mess_bill');
        }
    };

    const handleSendEmail = async () => {
        // If an external handler is provided, delegate to it (legacy support)
        if (typeof onSendEmail === 'function' && !onSendEmail.toString().includes('generatePDFBase64')) {
            onSendEmail();
            return;
        }

        setSendingEmail(true);
        try {
            const base64 = await generatePDFBase64({
                printRef,
                title: `Invoice ${INV_NO}`,
                subject: `Mess Bill - ${displayMonth}`,
            });
            if (!base64) {
                toast.error('Failed to generate invoice PDF');
                return;
            }
            await invoiceService.sendInvoicePdf({
                pdfBase64: base64,
                fileName: `${INV_NO}.pdf`,
                monthName: displayMonth,
            });
            toast.success('📧 Invoice sent to your email!');
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Failed to send invoice email');
        } finally {
            setSendingEmail(false);
        }
    };

    return (
        <motion.div
            ref={invoiceRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl backdrop-saturate-150 border border-black/5 dark:border-white/10 overflow-hidden shadow-lg dark:shadow-black/40 hover:shadow-xl hover:shadow-emerald-500/[0.08] transition-all duration-300 hover:-translate-y-1 before:absolute before:inset-x-12 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/70 dark:before:via-white/20 before:to-transparent before:pointer-events-none"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <HiOutlineDocumentText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Mess Bill Invoice</h3>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                                <HiOutlineSparkles className="w-3 h-3" /> {displayMonth}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            <HiOutlineBuildingOffice2 className="inline w-4 h-4 mr-1 -mt-0.5" />
                            United Mess · {displayDate}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-0.5">
                    <p className="text-xs font-mono text-gray-400 dark:text-gray-500">{INV_NO}</p>
                    {user?.name && <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>}
                    {user?.email && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{user.email}</p>}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="px-2 pt-4">
                <div className="flex flex-wrap gap-4">
                    <StatCard
                        icon={HiOutlineShoppingCart}
                        label="Market Total"
                        value={`₹${fmt(grandTotalMarketAmount)}`}
                        subLabel="All members"
                    />
                    <StatCard
                        icon={HiOutlineUsers}
                        label="Total Meals"
                        value={`${fmt(grandTotalMeal)}`}
                        subLabel="All members"
                    />
                    <StatCard
                        icon={HiOutlineCurrencyRupee}
                        label="Your Payable"
                        value={`₹${fmt(finalPayable)}`}
                        subLabel={isRefund ? 'Refund due' : 'Due now'}
                        accent={!isRefund}
                    />
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="px-6 py-4">
                <SectionDivider label="Your usage" />
                <LineItem icon={HiOutlineStar} label="Your meals" value={`${fmt(totalMeal)} meals`} />
                <LineItem icon={HiOutlineShoppingCart} label="Your market spend" value={`₹${fmt(totalMarketAmount)}`} subText="What you spent" />

                <SectionDivider label="Monthly charges" />
                <LineItem icon={HiOutlineBeaker} label="Water bill" value={`₹${fmt(waterBill)}`} />
                <LineItem icon={HiOutlineWrenchScrewdriver} label="Cooking charge" value={`₹${fmt(cookingCharge)}`} />
                {guestMeal > 0 && (
                    <LineItem
                        icon={HiOutlineUserGroup}
                        label="Guest meals"
                        subText={`${guestMeal} meal(s) × ₹${fmt(chargePerGuestMeal)}`}
                        value={`₹${fmt(guestMealAmount)}`}
                    />
                )}

                <SectionDivider label="Calculations" />
                <LineItem icon={HiOutlineCurrencyRupee} label="Cost of your meals" value={`₹${fmt(costOfMeals)}`} subText="Proportional share" accent />
                <LineItem icon={HiOutlineCurrencyRupee} label="Adjusted meal charge" value={`₹${fmt(adjustedMealCharge)}`} subText="After guest deduction" accent />

                <LineItem icon={HiOutlineReceiptPercent} label="Platform Fee" value={`₹${fmt(platformFee || 0)}`} subText="Fixed service fee" />
                
                {dueCarryOver > 0 && (
                    <>
                        <SectionDivider label="Previous Balance" />
                        <LineItem icon={HiOutlineClock} label="Carry-over Amount" value={`₹${fmt(dueCarryOver)}`} subText="Unpaid balance from past months" accent />
                    </>
                )}
            </div>

            {/* Total & Actions */}
            <div className={`px-6 py-5 rounded-b-2xl ${isRefund ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-gray-50 dark:bg-gray-800/30'}`}>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                            {isRefund ? 'Refund amount' : 'Total payable'}
                        </p>
                        <div className="flex items-baseline gap-3">
                            <span className={`text-3xl sm:text-4xl font-bold tabular-nums ${isRefund ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                                ₹{fmt(displayAmt)}
                            </span>
                            {isRefund && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                                    <HiOutlineArrowTrendingDown className="w-3 h-3" /> Refund
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Status badge */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        isPaid
                            ? 'border-emerald-200 dark:border-emerald-800'
                            : isPartiallyPaid
                                ? 'border-amber-200 dark:border-amber-700'
                                : isRefund
                                    ? 'border-emerald-200 dark:border-emerald-800'
                                    : 'border-amber-200 dark:border-amber-800'
                        }`}>
                        {isPaid ? (
                            <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : isPartiallyPaid ? (
                            <HiOutlineCurrencyRupee className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        ) : isRefund ? (
                            <HiOutlineArrowTrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <HiOutlineCurrencyRupee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                        <span className={`text-xs font-semibold ${
                            isPaid
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isPartiallyPaid
                                    ? 'text-amber-500 dark:text-amber-400'
                                    : isRefund
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-amber-600 dark:text-amber-400'
                            }`}>
                            {isPaid ? 'Paid' : isPartiallyPaid ? 'Partially Paid' : isRefund ? 'Refund' : 'Due'}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* ── Payment already completed ── */}
                    {isPaid ? (
                        <div className="flex-1 flex items-start gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                            <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Mess Bill Payment Successful!</p>
                                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                                    ₹{fmt(displayAmt)} has been received. Your invoice is final.
                                </p>
                            </div>
                        </div>

                    ) : isPartiallyPaid ? (
                        /* ── Partial payment state ── */
                        <div className="flex-1 flex flex-col gap-3">
                            {/* Progress bar */}
                            <div className="w-full">
                                <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    <span>Paid: ₹{fmt(paidAmount)}</span>
                                    <span>{paidPercent}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${paidPercent}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                                    />
                                </div>
                            </div>
                            {/* Remaining amount notice */}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40">
                                <HiOutlineCurrencyRupee className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                        ₹{fmt(remainingAmount)} remaining
                                    </p>
                                    <p className="text-xs text-amber-700/70 dark:text-amber-400/60 mt-0.5">
                                        Please pay the remaining balance to fully settle your mess bill.
                                    </p>
                                </div>
                            </div>
                            {/* Pay remaining button */}
                            {typeof onPayNow === 'function' && (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={!!isPaying}
                                    onClick={() => onPayNow(remainingAmount, 'mess_bill')}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-lg text-sm font-semibold text-white
                                        bg-amber-500 hover:bg-amber-600
                                        shadow-[0_6px_20px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]
                                        hover:shadow-[0_10px_30px_rgba(245,158,11,0.45)]
                                        disabled:opacity-60 disabled:cursor-not-allowed
                                        transition-all duration-300"
                                >
                                    {isPaying ? (
                                        <Spinner size="sm" color="white" />
                                    ) : (
                                        <HiOutlineCurrencyRupee className="w-5 h-5" />
                                    )}
                                    <span>{isPaying ? 'Processing…' : `Pay Remaining ₹${fmt(remainingAmount)}`}</span>
                                </motion.button>
                            )}
                        </div>

                    ) : isRefund ? (
                        <div className="flex-1 flex items-start gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                            <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">You have a refund!</p>
                                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                                    ₹{fmt(displayAmt)} will be credited back. Contact your mess admin.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={!!isPaying}
                            onClick={handlePayNow}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-lg text-sm font-semibold text-white 
                            bg-indigo-600 hover:bg-indigo-700 
                            shadow-[0_6px_20px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] 
                            hover:shadow-[0_10px_30px_rgba(79,70,229,0.45)] 
                            disabled:opacity-60 disabled:cursor-not-allowed 
                            transition-all duration-300"
                        >
                            {isPaying ? (
                                <Spinner size="sm" color="white" />
                            ) : (
                                <SiRazorpay className="w-5 h-5" />
                            )}
                            <span>{isPaying ? 'Processing…' : `Pay ₹${fmt(finalPayable)}`}</span>
                        </motion.button>
                    )}

                    <div className="flex gap-3 w-full sm:w-auto">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isDownloading}
                            onClick={handleDownloadPDF}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-medium 
                            border border-gray-300/60 dark:border-white/10 
                            bg-white/70 dark:bg-gray-800/60 backdrop-blur-md
                            text-gray-700 dark:text-gray-200 
                            shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)] 
                            hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] 
                            hover:bg-white/80 dark:hover:bg-gray-700/60
                            transition-all duration-300 disabled:opacity-60"
                            title="Download Invoice PDF"
                        >
                            {isDownloading ? (
                                <Spinner size="sm" color="current" className="text-gray-600 dark:text-gray-300" />
                            ) : (
                                <HiOutlineArrowDownTray className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">Download</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={!!(isSendingEmail || sendingEmail)}
                            onClick={handleSendEmail}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-medium 
                            border border-gray-300/60 dark:border-white/10 
                            bg-white/70 dark:bg-gray-800/60 backdrop-blur-md
                            text-gray-700 dark:text-gray-200 
                            shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)] 
                            hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] 
                            hover:bg-white/80 dark:hover:bg-gray-700/60
                            transition-all duration-300 disabled:opacity-60"
                        >
                            {(isSendingEmail || sendingEmail) ? (
                                <Spinner size="sm" color="current" className="text-gray-600 dark:text-gray-300" />
                            ) : (
                                <HiOutlineEnvelope className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">Email</span>
                        </motion.button>
                    </div>
                </div>

                {/* Fine print */}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
                    System‑generated invoice for {displayMonth}. For disputes, contact your mess admin.
                </p>
            </div>

            <div
                style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -1 }}
                aria-hidden="true"
            >
                <div ref={printRef}>
                    <PrintInvoice
                        data={data}
                        user={user}
                        platformFee={platformFee}
                        finalPayable={finalPayable}
                        displayMonth={displayMonth}
                        displayDate={displayDate}
                        isRefund={isRefund}
                        dueCarryOver={dueCarryOver}
                        invoiceNo={INV_NO}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default MessBillInvoice;