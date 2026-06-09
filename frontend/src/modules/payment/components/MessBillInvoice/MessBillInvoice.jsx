import { useState, useMemo, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    HiOutlineCheckCircle,
    HiOutlineArrowTrendingDown,
    HiOutlineReceiptPercent,
    HiOutlineDocumentText,
    HiOutlineEnvelope,
    HiOutlineSparkles,
    HiOutlineBuildingOffice2,
    HiOutlineClock,
    HiOutlineArrowDownTray,
    HiOutlineShieldCheck,
    HiOutlineChevronDown,
    HiOutlineIdentification,
    HiOutlineCalendarDays,
    HiOutlineXMark,
} from 'react-icons/hi2';
import { Spinner } from '@/shared/components/ui';
import { fmt } from '@/core/utils/helpers/currency.helper';

/* ────────────────────────────────────────
   SUB-COMPONENTS (memoized)
   ──────────────────────────────────────── */

/** Premium card for summary statistics */
const StatCard = memo(({ icon: Icon, label, value, subLabel, accent = false }) => (
    <div
        className={`flex-1 min-w-[150px] p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
            accent
                ? 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-200 dark:border-indigo-800 shadow-indigo-500/5'
                : 'bg-white/80 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 shadow-gray-500/5'
        }`}
    >
        <div className="flex items-start gap-3">
            <div
                className={`p-2.5 rounded-xl ${
                    accent
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
            >
                <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
                <p
                    className={`text-2xl font-bold tabular-nums mt-1 ${
                        accent ? 'text-indigo-700 dark:text-indigo-200' : 'text-gray-900 dark:text-white'
                    }`}
                >
                    {value}
                </p>
                {subLabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subLabel}</p>}
            </div>
        </div>
    </div>
));

/** Individual breakdown line */
const LineItem = memo(({ icon: Icon, label, value, subText, accent = false }) => (
    <div className="flex items-center justify-between py-3.5 px-1 border-b border-gray-100 dark:border-gray-800/60 last:border-0 group transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/40 rounded-lg">
        <div className="flex items-center gap-3 min-w-0">
            <div
                className={`p-2 rounded-lg transition-colors ${
                    accent
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
            >
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className={`text-sm font-medium ${accent ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>
                    {label}
                </p>
                {subText && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{subText}</p>}
            </div>
        </div>
        <span
            className={`text-sm font-bold tabular-nums whitespace-nowrap ml-4 ${
                accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'
            }`}
        >
            {value}
        </span>
    </div>
));

/** Section divider with uppercase label */
const SectionDivider = memo(({ label }) => (
    <div className="flex items-center gap-3 pt-6 pb-3 first:pt-0">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">{label}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent" />
    </div>
));

/* ────────────────────────────────────────
   MAIN INVOICE COMPONENT
   ──────────────────────────────────────── */
const MessBillInvoice = ({
    data,
    isAdmin,
    user,
    platformFee = 0,
    onPayNow,
    isPaying,
    paymentStatus = 'pending',
    paymentRecord,
}) => {
    const invMeta = useMemo(() => {
        const monthStr = data?.monthName || paymentRecord?.month;
        let d;
        if (monthStr) {
            const p = monthStr.split(/\s+/);
            if (p.length >= 2) d = new Date(`${p[0]} 1, ${p[p.length - 1]}`);
        }
        if (!d || isNaN(d.getTime())) d = new Date();
        return {
            month: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
            date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            no: `UM-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        };
    }, [data?.monthName, paymentRecord?.month]);

    const displayMonth = useMemo(() => {
        return paymentRecord?.month || data?.monthName || invMeta.month;
    }, [paymentRecord, data, invMeta.month]);

    const displayDate = useMemo(() => {
        if (paymentRecord?.paymentDate) {
            return new Date(paymentRecord.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return invMeta.date;
    }, [paymentRecord, invMeta.date]);

    /* Numeric month (1-12) and year derived from the active billing period */
    const billingNums = useMemo(() => {
        const monthStr = data?.monthName || paymentRecord?.month;
        let d;
        if (monthStr) {
            const p = monthStr.split(/\s+/);
            if (p.length >= 2) d = new Date(`${p[0]} 1, ${p[p.length - 1]}`);
        }
        if (!d || isNaN(d.getTime())) d = new Date();
        return { month: d.getMonth() + 1, year: d.getFullYear() };
    }, [data?.monthName, paymentRecord?.month]);

    const basePayable = data?.payableAmount ?? 0;
    const finalPayable = basePayable;
    const isRefund = useMemo(() => finalPayable < 0, [finalPayable]);
    const displayAmt = useMemo(() => Math.abs(finalPayable), [finalPayable]);

    const [isExpanded, setIsExpanded] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingAllEmails,    setSendingAllEmails]    = useState(false);
    const [isEmailAllModalOpen, setIsEmailAllModalOpen] = useState(false);
    const [selectedMonth,       setSelectedMonth]       = useState(1);
    const [selectedYear,        setSelectedYear]        = useState(() => new Date().getFullYear());
    const invoiceRef = useRef(null);
    const printRef = useRef(null);
    const { isDownloading, downloadPDF, generatePDFBase64 } = useDownloadInvoice();

    if (!data) return null;

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

    const isPaid = paymentStatus === 'success';
    const isPartiallyPaid = paymentStatus === 'partially_paid';

    const paidAmount = paymentRecord?.paidAmount ?? 0;
    const totalPayable = paymentRecord?.totalPayable ?? finalPayable;
    const remainingAmount = paymentRecord?.remainingAmount ?? Math.max(0, totalPayable - paidAmount);
    const paidPercent = totalPayable > 0 ? Math.min(100, Math.round((paidAmount / totalPayable) * 100)) : 0;

    const handleOpenPaymentFlow = () => {
        if (typeof onPayNow === 'function') {
            onPayNow(displayMonth);
        }
    };

    const handleDownloadPDF = () => {
        downloadPDF({
            printRef,
            fileName: invMeta.no,
            title: `Invoice ${invMeta.no}`,
            subject: `Mess Bill - ${displayMonth}`,
        });
    };

    const handleSendEmail = async () => {
        setSendingEmail(true);
        try {
            const base64 = await generatePDFBase64({
                printRef,
                title: `Invoice ${invMeta.no}`,
                subject: `Mess Bill - ${displayMonth}`,
            });
            if (!base64) {
                toast.error('Failed to generate invoice PDF');
                return;
            }
            await invoiceService.sendInvoicePdf({
                pdfBase64: base64,
                fileName: `${invMeta.no}.pdf`,
                monthName: displayMonth,
            });
            toast.success('Invoice sent to your email!');
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Failed to send invoice email');
        } finally {
            setSendingEmail(false);
        }
    };

    /* Opens the month/year picker modal, pre-filled with the active billing period */
    const openEmailAllModal = () => {
        setSelectedMonth(billingNums.month);
        setSelectedYear(billingNums.year);
        setIsEmailAllModalOpen(true);
    };

    const handleEmailAll = async () => {
        setSendingAllEmails(true);
        try {
            const res = await invoiceService.emailAllInvoices({ month: selectedMonth, year: selectedYear });
            const { sent, failed } = res?.data ?? {};
            setIsEmailAllModalOpen(false);
            if (failed > 0) {
                toast.success(
                    `Emailed ${sent} member${sent !== 1 ? 's' : ''}, ${failed} failed. Check server logs for details.`
                );
            } else {
                toast.success(`Invoice emailed to all ${sent} members successfully!`);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Failed to send invoices to all members');
        } finally {
            setSendingAllEmails(false);
        }
    };

    const statusLabel = isPaid ? 'Paid' : isPartiallyPaid ? 'Partial' : isRefund ? 'Refund' : 'Due';
    const statusCls   = isPaid
        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-400/30'
        : isPartiallyPaid
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-400/30'
        : isRefund
        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-400/30'
        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-400/30';

    return (
        <motion.div
            ref={invoiceRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative mx-auto w-full max-w-none rounded-xl bg-card border border-border/50 overflow-hidden shadow-sm transition-all duration-200 ease-out transform-gpu hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md motion-reduce:hover:translate-y-0 contain-layout"
        >
            {/* ── Collapsed summary bar ── */}
            <button
                type="button"
                onClick={() => setIsExpanded(p => !p)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
                        <HiOutlineDocumentText className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Mess Bill Invoice</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 uppercase tracking-wide bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-700/50">
                                {displayMonth}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            United Mess · {displayDate}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                        <p className="text-lg font-black tabular-nums text-gray-900 dark:text-white">
                            {isRefund ? '−' : ''}₹{fmt(displayAmt)}
                        </p>
                        <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${statusCls}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="w-7 h-7 rounded-full bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground"
                    >
                        <HiOutlineChevronDown className="w-4 h-4" />
                    </motion.div>
                </div>
            </button>

            {/* ── Expandable full invoice ── */}
            <AnimatePresence initial={false}>
            {isExpanded && (
            <motion.div
                key="invoice-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-gray-200 dark:border-gray-800/60"
            >
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-6 md:px-8 pt-6 md:pt-8 pb-5 border-b border-gray-200 dark:border-gray-800/60">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <HiOutlineDocumentText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center flex-wrap gap-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Mess Bill Invoice</h3>
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-700/50">
                                <HiOutlineSparkles className="w-3.5 h-3.5" /> {displayMonth}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                            <HiOutlineBuildingOffice2 className="w-4 h-4" />
                            United Mess · {displayDate}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-0.5">
                    <p className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                        {invMeta.no}
                    </p>
                    {user?.name && <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>}
                    {user?.email && <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px] truncate">{user.email}</p>}
                </div>
            </div>

            {/* ── Summary Stats ── */}
            <div className="px-4 md:px-6 pt-6 pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard icon={HiOutlineShoppingCart} label="Market Total" value={`₹${fmt(grandTotalMarketAmount)}`} subLabel="All members" />
                    <StatCard icon={HiOutlineUsers} label="Total Meals" value={fmt(grandTotalMeal)} subLabel="All members" />
                    <StatCard icon={HiOutlineCurrencyRupee} label="Your Payable" value={`₹${fmt(finalPayable)}`} subLabel={isRefund ? 'Refund due' : 'Due now'} accent />
                </div>
            </div>

            {/* ── Detailed Breakdown ── */}
            <div className="px-4 md:px-6 py-6 space-y-1">
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
                        <LineItem icon={HiOutlineClock} label="Carry-over Amount" value={`₹${fmt(dueCarryOver)}`} subText="Unpaid from past months" accent />
                    </>
                )}
            </div>

            {/* ── Total & Payment Area ── */}
            <div className={`px-4 md:px-6 pt-6 pb-8 mt-0 rounded-b-2xl border-t border-gray-200 dark:border-gray-800 ${
            isRefund
                ? 'bg-gradient-to-b from-emerald-50/60 to-white dark:from-emerald-900/10 dark:to-gray-900/20'
                : 'bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/40 dark:to-gray-900/20'
            }`}>

            {/* ── Amount + Status unified card ── */}
            <div className={`flex items-center justify-between gap-4 p-4 md:p-5 rounded-2xl mb-5 border shadow-sm ${
                isPaid
                ? 'bg-white dark:bg-gray-800/70 border-emerald-200/70 dark:border-emerald-800/60'
                : isRefund
                ? 'bg-white dark:bg-gray-800/70 border-emerald-200/70 dark:border-emerald-800/60'
                : isPartiallyPaid
                ? 'bg-white dark:bg-gray-800/70 border-amber-200/70 dark:border-amber-800/60'
                : 'bg-white dark:bg-gray-800/70 border-gray-200 dark:border-gray-700'
            }`}>
                <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500 mb-1">
                    {isRefund ? 'Refund Amount' : 'Total Payable'}
                </p>
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-3xl md:text-4xl font-black tabular-nums leading-none ${
                    isRefund ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
                    }`}>
                    {isRefund ? '−' : ''}₹{fmt(displayAmt)}
                    </span>
                    {isPartiallyPaid && totalPayable > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                        of ₹{fmt(totalPayable)}
                    </span>
                    )}
                </div>
                </div>

                {/* ── Premium Status Pill ── */}
                <div className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border shadow-sm select-none backdrop-blur-sm transition-all duration-200 ${
                isPaid
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:bg-emerald-400/10 dark:border-emerald-400/30 dark:text-emerald-300 shadow-emerald-500/10'
                    : isPartiallyPaid
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:bg-amber-400/10 dark:border-amber-400/30 dark:text-amber-300 shadow-amber-500/10'
                    : isRefund
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:bg-emerald-400/10 dark:border-emerald-400/30 dark:text-emerald-300 shadow-emerald-500/10'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:bg-amber-400/10 dark:border-amber-400/30 dark:text-amber-300 shadow-amber-500/10'
                }`}>
                {isPaid ? <HiOutlineCheckCircle className="w-3.5 h-3.5" /> :
                isPartiallyPaid ? <HiOutlineCurrencyRupee className="w-3.5 h-3.5" /> :
                isRefund ? <HiOutlineArrowTrendingDown className="w-3.5 h-3.5" /> :
                <HiOutlineCurrencyRupee className="w-3.5 h-3.5" />}
                <span>{isPaid ? 'Paid' : isPartiallyPaid ? 'Partial' : isRefund ? 'Refund' : 'Due'}</span>
                </div>
            </div>

            {/* ── Payment Confirmation Block (unchanged, kept clean) ── */}
            {(paymentRecord?.paymentMethod === 'upi_manual' && paymentRecord?.transactionId) || isPaid || isRefund ? (
                <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-5 shadow-sm">
                {paymentRecord?.paymentMethod === 'upi_manual' && paymentRecord?.transactionId && (
                    <div className="flex items-start gap-3 px-4 py-3.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200/60 dark:border-blue-800/50">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <HiOutlineIdentification className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wide">UPI Manual Payment</p>
                        {paymentRecord.status === 'pending_verification' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                            Pending Review
                            </span>
                        )}
                        {paymentRecord.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                            <HiOutlineCheckCircle className="w-3 h-3" /> Verified
                            </span>
                        )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400/70">UTR</span>
                        <span className="text-sm font-mono font-bold text-blue-900 dark:text-blue-100 select-all tracking-tight break-all">
                            {paymentRecord.transactionId}
                        </span>
                        </div>
                    </div>
                    </div>
                )}
                {isPaid && (
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-emerald-50 dark:bg-emerald-900/20">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                        <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Payment Successful</p>
                        <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                        ₹{fmt(displayAmt)} received · Invoice is final
                        </p>
                    </div>
                    <div className="flex-shrink-0 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-700/50">
                        SETTLED
                    </div>
                    </div>
                )}
                {isRefund && !isPaid && (
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-emerald-50 dark:bg-emerald-900/20">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                        <HiOutlineArrowTrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Refund Applicable</p>
                        <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                        ₹{fmt(displayAmt)} will be credited · Contact your mess admin
                        </p>
                    </div>
                    </div>
                )}
                </div>
            ) : null}

            {/* ── Partial Payment Progress (lightly enhanced) ── */}
            {isPartiallyPaid && (
                <div className="mb-5 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-800/60 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-200">Payment Progress</span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums">{paidPercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-amber-200/60 dark:bg-amber-900/40 overflow-hidden mb-3">
                    <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${paidPercent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-inner"
                    />
                </div>
                <div className="flex items-center justify-between text-[11px] text-amber-700/70 dark:text-amber-400/60 font-semibold">
                    <span>Paid: ₹{fmt(paidAmount)}</span>
                    <span>Remaining: ₹{fmt(remainingAmount)}</span>
                </div>
                </div>
            )}

            {/* ── Premium Pay Now / Remaining Button ── */}
            {!isPaid && !isRefund && (
                <button
                disabled={isPaying}
                onClick={handleOpenPaymentFlow}
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl text-sm font-bold text-white mb-3 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 ${
                    isPartiallyPaid
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 shadow-[0_4px_14px_rgba(245,158,11,0.25)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.35)]'
                    : 'bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:from-indigo-800 active:to-indigo-900 shadow-[0_4px_14px_rgba(79,70,229,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.35)]'
                }`}
                >
                <span>{isPartiallyPaid ? 'Pay Remaining Balance' : 'Pay Bill'}</span>
                {!isPartiallyPaid && <HiOutlineShieldCheck className="w-4 h-4 opacity-80" />}
                </button>
            )}

            {/* ── Download / Email actions (polished with subtle glass) ── */}
            <div className="grid grid-cols-2 gap-3">
                <button
                disabled={isDownloading}
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold border bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] disabled:opacity-60 disabled:scale-100 transition-all duration-200 text-gray-700 dark:text-gray-200 shadow-sm"
                >
                {isDownloading ? <Spinner size="sm" color="current" /> : <HiOutlineArrowDownTray className="w-4 h-4 flex-shrink-0" />}
                <span>Download</span>
                </button>
                <button
                disabled={sendingEmail}
                onClick={handleSendEmail}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold border bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] disabled:opacity-60 disabled:scale-100 transition-all duration-200 text-gray-700 dark:text-gray-200 shadow-sm"
                >
                {sendingEmail ? <Spinner size="sm" color="current" /> : <HiOutlineEnvelope className="w-4 h-4 flex-shrink-0" />}
                <span>Email</span>
                </button>
            </div>

            {/* ── Admin: Email to all members ── */}
            {isAdmin && (
                <button
                disabled={sendingAllEmails}
                onClick={openEmailAllModal}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold border bg-indigo-50/80 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 active:scale-[0.98] disabled:opacity-60 disabled:scale-100 transition-all duration-200 text-indigo-700 dark:text-indigo-300 shadow-sm mt-3"
                >
                {sendingAllEmails ? <Spinner size="sm" color="current" /> : <HiOutlineUsers className="w-4 h-4 flex-shrink-0" />}
                <span>{sendingAllEmails ? 'Sending to all members…' : 'Email to all'}</span>
                </button>
            )}

            {/* ── Footer disclaimer ── */}
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-5 text-center leading-relaxed">
                System‑generated invoice for {displayMonth}. For disputes, contact your mess admin.
            </p>
            </div>

            </motion.div>
            )}
            </AnimatePresence>

            {/* ── Email All Modal — admin month/year picker ── */}
            <AnimatePresence>
            {isEmailAllModalOpen && (
            <motion.div
                key="email-all-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.52)' }}
                onClick={(e) => { if (e.target === e.currentTarget && !sendingAllEmails) setIsEmailAllModalOpen(false); }}
            >
                <motion.div
                    key="email-all-card"
                    initial={{ opacity: 0, scale: 0.94, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 14 }}
                    transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full max-w-sm bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── Modal Header ── */}
                    <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
                                <HiOutlineUsers className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Email Invoice to All</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select the billing month to send</p>
                            </div>
                        </div>
                        <button
                            onClick={() => !sendingAllEmails && setIsEmailAllModalOpen(false)}
                            disabled={sendingAllEmails}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-40 flex-shrink-0"
                            aria-label="Close dialog"
                        >
                            <HiOutlineXMark className="w-4 h-4" />
                        </button>
                    </div>

                    {/* ── Modal Body ── */}
                    <div className="px-6 py-5 space-y-4">
                        {/* Month + Year selects */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    Month
                                </label>
                                <select
                                    id="email-all-month"
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(Number(e.target.value))}
                                    disabled={sendingAllEmails}
                                    className="w-full px-3 py-2.5 text-sm font-medium rounded-xl border border-border/60 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                                        <option key={m} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    Year
                                </label>
                                <select
                                    id="email-all-year"
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(Number(e.target.value))}
                                    disabled={sendingAllEmails}
                                    className="w-full px-3 py-2.5 text-sm font-medium rounded-xl border border-border/60 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Selected period preview chip */}
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-200/60 dark:border-indigo-700/40">
                            <HiOutlineCalendarDays className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                Sending invoices for{' '}
                                <span className="font-bold">
                                    {['January','February','March','April','May','June','July','August','September','October','November','December'][selectedMonth - 1]}{' '}{selectedYear}
                                </span>
                            </p>
                        </div>

                        {/* Irreversibility warning */}
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40">
                            <HiOutlineEnvelope className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                This will email a PDF invoice to every active member. Emails cannot be recalled once sent.
                            </p>
                        </div>
                    </div>

                    {/* ── Modal Footer ── */}
                    <div className="flex gap-3 px-6 pb-6">
                        <button
                            id="email-all-cancel"
                            onClick={() => setIsEmailAllModalOpen(false)}
                            disabled={sendingAllEmails}
                            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border border-border/60 bg-white/70 dark:bg-gray-800/70 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                        <button
                            id="email-all-confirm"
                            onClick={handleEmailAll}
                            disabled={sendingAllEmails}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-[0_4px_14px_rgba(79,70,229,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.35)] transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {sendingAllEmails
                                ? <Spinner size="sm" color="current" />
                                : <HiOutlineEnvelope className="w-4 h-4 flex-shrink-0" />}
                            <span>{sendingAllEmails ? 'Sending…' : 'Send Invoices'}</span>
                        </button>
                    </div>
                </motion.div>
            </motion.div>
            )}
            </AnimatePresence>

            {/* Hidden print container */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -1 }} aria-hidden="true">
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
                        invoiceNo={invMeta.no}
                        paymentStatus={paymentStatus}
                        paymentMethod={paymentRecord?.paymentMethod}
                        transactionId={paymentRecord?.transactionId}
                        paymentDate={paymentRecord?.paymentDate}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default MessBillInvoice;