import { useState, useMemo, memo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    HiOutlineExclamationTriangle,
    HiOutlineSparkles,
    HiOutlineBuildingOffice2,
    HiOutlineArrowDownTray,
    HiOutlineShieldCheck,
    HiOutlineChevronDown,
    HiOutlineIdentification,
    HiOutlineCalendarDays,
    HiOutlineXMark,
} from 'react-icons/hi2';
import { Spinner } from '@/shared/components/ui';
import { fmt } from '@/core/utils/helpers/currency.helper';

const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

/* ────────────────────────────────────────
   SUB-COMPONENTS (memoized)
   ──────────────────────────────────────── */

/** Premium card for summary statistics */
const StatCard = memo(({ icon: Icon, label, value, subLabel, accent = false }) => (
    <div
        className={`flex-1 min-w-[150px] p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
            accent
                ? 'bg-primary/10 border-primary/20 shadow-primary/5'
                : 'bg-card/80 border-border shadow-muted-foreground/5'
        }`}
    >
        <div className="flex items-start gap-3">
            <div
                className={`p-2.5 rounded-xl ${
                    accent
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                }`}
            >
                <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p
                    className={`text-2xl font-bold tabular-nums mt-1 ${
                        accent ? 'text-primary' : 'text-foreground'
                    }`}
                >
                    {value}
                </p>
                {subLabel && <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>}
            </div>
        </div>
    </div>
));
StatCard.displayName = 'StatCard';

/** Individual breakdown line */
const LineItem = memo(({ icon: Icon, label, value, subText, accent = false }) => (
    <div className="flex items-center justify-between py-3.5 px-1 border-b border-border last:border-0 group transition-colors hover:bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3 min-w-0">
            <div
                className={`p-2 rounded-lg transition-colors ${
                    accent
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                }`}
            >
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className={`text-sm font-medium ${accent ? 'text-primary' : 'text-foreground'}`}>
                    {label}
                </p>
                {subText && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subText}</p>}
            </div>
        </div>
        <span
            className={`text-sm font-bold tabular-nums whitespace-nowrap ml-4 ${
                accent ? 'text-primary' : 'text-foreground'
            }`}
        >
            {value}
        </span>
    </div>
));
LineItem.displayName = 'LineItem';

/** Section divider with uppercase label */
const SectionDivider = memo(({ label }) => (
    <div className="flex items-center gap-3 pt-6 pb-3 first:pt-0">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
));
SectionDivider.displayName = 'SectionDivider';

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

    /* Opens the month/year picker modal, pre-filled with the active billing period */
    const openEmailAllModal = useCallback(() => {
        setSelectedMonth(billingNums.month);
        setSelectedYear(billingNums.year);
        setIsEmailAllModalOpen(true);
    }, [billingNums.month, billingNums.year]);

    const handleEmailAll = useCallback(async () => {
        setSendingAllEmails(true);
        try {
            const res = await invoiceService.emailAllInvoices({ month: selectedMonth, year: selectedYear });
            const { sent, failed } = res?.data ?? {};
            setIsEmailAllModalOpen(false);
            if (failed > 0) {
                toast(
                    `Emailed ${sent} member${sent !== 1 ? 's' : ''}, ${failed} failed. Check server logs for details.`,
                    { icon: '\u26A0\uFE0F' }
                );
            } else {
                toast.success(`Invoice emailed to all ${sent} members successfully!`);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Failed to send invoices to all members');
        } finally {
            setSendingAllEmails(false);
        }
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        if (!isEmailAllModalOpen) return;
        document.body.style.overflow = 'hidden';
        const handleEsc = (e) => {
            if (e.key === 'Escape' && !sendingAllEmails) setIsEmailAllModalOpen(false);
        };
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isEmailAllModalOpen, sendingAllEmails]);

    if (!data) return null;

    const {
        grandTotalMarketAmount = 0,
        grandTotalMeal = 0,
        adjustedMealCharge = 0,
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

    const statusLabel = isPaid ? 'Paid' : isPartiallyPaid ? 'Partial' : isRefund ? 'Refund' : 'Due';
    const statusCls   = isPaid
        ? 'bg-success-bg text-success-text'
        : isPartiallyPaid
        ? 'bg-warning-bg text-warning-text'
        : isRefund
        ? 'bg-success-bg text-success-text'
        : 'bg-warning-bg text-warning-text';

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
                className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-foreground/5 transition-colors text-left"
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
                        <HiOutlineDocumentText className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-foreground tracking-tight">Mess Bill Invoice</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                                {displayMonth}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            United Mess · {displayDate}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                        <p className="text-lg font-black tabular-nums text-foreground">
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
                className="overflow-hidden border-t border-border"
            >
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-6 md:px-8 pt-6 md:pt-8 pb-5 border-b border-border">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                        <HiOutlineDocumentText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center flex-wrap gap-2">
                            <h3 className="text-xl font-bold text-foreground tracking-tight">Mess Bill Invoice</h3>
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                                <HiOutlineSparkles className="w-3.5 h-3.5" /> {displayMonth}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1">
                            <HiOutlineBuildingOffice2 className="w-4 h-4" />
                            United Mess · {displayDate}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-0.5">
                    <p className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {invMeta.no}
                    </p>
                    {user?.name && <p className="text-sm font-semibold text-foreground">{user.name}</p>}
                    {user?.email && <p className="text-xs text-muted-foreground max-w-[200px] truncate">{user.email}</p>}
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


            </div>

            {/* ── Total & Payment Area ── */}
            <div className={`px-4 md:px-6 pt-6 pb-8 mt-0 rounded-b-2xl border-t border-border ${
            isRefund
                ? 'bg-card'
                : 'bg-card'
            }`}>

            {/* ── Amount + Status unified card ── */}
            <div className={`flex items-center justify-between gap-4 p-4 md:p-5 rounded-2xl mb-5 border shadow-sm ${
                isPaid
                ? 'bg-card border-success-border'
                : isRefund
                ? 'bg-card border-success-border'
                : isPartiallyPaid
                ? 'bg-card border-warning-border'
                : 'bg-card border-border'
            }`}>
                <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                    {isRefund ? 'Refund Amount' : 'Total Payable'}
                </p>
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-3xl md:text-4xl font-black tabular-nums leading-none ${
                    isRefund ? 'text-success-text' : 'text-foreground'
                    }`}>
                    {isRefund ? '−' : ''}₹{fmt(displayAmt)}
                    </span>
                    {isPartiallyPaid && totalPayable > 0 && (
                    <span className="text-xs text-muted-foreground font-medium">
                        of ₹{fmt(totalPayable)}
                    </span>
                    )}
                </div>
                </div>

                {/* ── Premium Status Pill ── */}
                <div className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border shadow-sm select-none backdrop-blur-sm transition-all duration-200 ${
                isPaid
                    ? 'bg-success-bg border-success-border text-success-text shadow-none'
                    : isPartiallyPaid
                    ? 'bg-warning-bg border-warning-border text-warning-text shadow-none'
                    : isRefund
                    ? 'bg-success-bg border-success-border text-success-text shadow-none'
                    : 'bg-warning-bg border-warning-border text-warning-text shadow-none'
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
                <div className="rounded-2xl overflow-hidden border border-border mb-5 shadow-sm">
                {paymentRecord?.paymentMethod === 'upi_manual' && paymentRecord?.transactionId && (
                    <div className="flex items-start gap-3 px-4 py-3.5 bg-primary/10 border-b border-primary/20">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <HiOutlineIdentification className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs font-bold text-primary uppercase tracking-wide">UPI Manual Payment</p>
                        {paymentRecord.status === 'pending_verification' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning-bg text-warning-text border border-warning-border">
                            Pending Review
                            </span>
                        )}
                        {paymentRecord.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-bg text-success-text border border-success-border">
                            <HiOutlineCheckCircle className="w-3 h-3" /> Verified
                            </span>
                        )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">UTR</span>
                        <span className="text-sm font-mono font-bold text-primary select-all tracking-tight break-all">
                            {paymentRecord.transactionId}
                        </span>
                        </div>
                    </div>
                    </div>
                )}
                {isPaid && (
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-success-bg">
                    <div className="w-8 h-8 rounded-lg bg-success-bg flex items-center justify-center flex-shrink-0">
                        <HiOutlineCheckCircle className="w-4 h-4 text-success-text" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-success-text">Payment Successful</p>
                        <p className="text-[11px] text-success-text/80 mt-0.5">
                        ₹{fmt(displayAmt)} received · Invoice is final
                        </p>
                    </div>
                    <div className="flex-shrink-0 text-[10px] font-bold text-success-text bg-success-bg px-2.5 py-1 rounded-lg border border-success-border">
                        SETTLED
                    </div>
                    </div>
                )}
                {isRefund && !isPaid && (
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-success-bg">
                    <div className="w-8 h-8 rounded-lg bg-success-bg flex items-center justify-center flex-shrink-0">
                        <HiOutlineArrowTrendingDown className="w-4 h-4 text-success-text" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-success-text">Refund Applicable</p>
                        <p className="text-[11px] text-success-text/80 mt-0.5">
                        ₹{fmt(displayAmt)} will be credited · Contact your mess admin
                        </p>
                    </div>
                    </div>
                )}
                </div>
            ) : null}

            {/* ── Partial Payment Progress (lightly enhanced) ── */}
            {isPartiallyPaid && (
                <div className="mb-5 p-4 rounded-2xl bg-warning-bg border border-warning-border backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-warning-text">Payment Progress</span>
                    <span className="text-xs font-bold text-warning-text tabular-nums">{paidPercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-warning-bg overflow-hidden mb-3">
                    <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${paidPercent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-warning to-warning shadow-inner"
                    />
                </div>
                <div className="flex items-center justify-between text-[11px] text-warning-text/70 font-semibold">
                    <span>Paid: ₹{fmt(paidAmount)}</span>
                    <span>Remaining: ₹{fmt(remainingAmount)}</span>
                </div>
                </div>
            )}

            {/* ── Premium Pay Now / Remaining Button ── */}
            {!isPaid && !isRefund && (
                <button
                type="button"
                disabled={isPaying}
                onClick={handleOpenPaymentFlow}
                className={`touch-target w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl text-sm font-bold text-white mb-3 transition-[transform,opacity,background,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 ${
                    isPartiallyPaid
                    ? 'bg-warning hover:brightness-90 active:from-amber-700 active:to-amber-800 shadow-md hover:shadow-lg'
                    : 'bg-primary hover:brightness-90 active:from-indigo-800 active:to-indigo-900 shadow-md hover:shadow-lg'
                }`}
                >
                <span>{isPartiallyPaid ? 'Pay Remaining Balance' : 'Pay Bill'}</span>
                {!isPartiallyPaid && <HiOutlineShieldCheck className="w-4 h-4 opacity-80" />}
                </button>
            )}

            {/* ── Download / Email actions ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <button
                type="button"
                disabled={isDownloading}
                onClick={handleDownloadPDF}
                className="touch-target flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold border bg-card border-input hover:bg-muted active:scale-[0.98] disabled:opacity-60 disabled:scale-100 transition-[transform,opacity,background,border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] text-foreground shadow-sm"
                >
                {isDownloading ? <Spinner size="sm" color="current" /> : <HiOutlineArrowDownTray className="w-4 h-4 flex-shrink-0" />}
                <span>Download</span>
                </button>
                <button
                type="button"
                disabled={sendingEmail}
                onClick={handleSendEmail}
                className="touch-target flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold border bg-card border-input hover:bg-muted active:scale-[0.98] disabled:opacity-60 disabled:scale-100 transition-[transform,opacity,background,border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] text-foreground shadow-sm"
                >
                {sendingEmail ? <Spinner size="sm" color="current" /> : <HiOutlineEnvelope className="w-4 h-4 flex-shrink-0" />}
                <span>Email</span>
                </button>
            </div>

            {/* ── Admin: Email to all members ── */}
            {isAdmin && (
                <button
                type="button"
                disabled={sendingAllEmails}
                onClick={openEmailAllModal}
                className="touch-target w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold border bg-primary/10 border-primary/20 hover:bg-primary/20 active:scale-[0.98] disabled:opacity-60 disabled:scale-100 transition-[transform,opacity,background,border-color] duration-[var(--duration-base)] ease-[var(--ease-out)] text-primary shadow-sm mt-3"
                >
                {sendingAllEmails ? <Spinner size="sm" color="current" /> : <HiOutlineUsers className="w-4 h-4 flex-shrink-0" />}
                <span>{sendingAllEmails ? 'Sending to all members…' : 'Email to all'}</span>
                </button>
            )}

            {/* ── Footer disclaimer ── */}
            <p className="text-[11px] text-muted-foreground mt-5 text-center leading-relaxed">
                System‑generated invoice for {displayMonth}. For disputes, contact your mess admin.
            </p>
            </div>

            </motion.div>
            )}
            </AnimatePresence>

            {/* ── Email All Modal — admin month/year picker ── */}
            {createPortal(
            <AnimatePresence>
            {isEmailAllModalOpen && (
            <div className="fixed inset-0 z-modal contain-[layout_style_paint]">
                <div
                    aria-label="Close modal"
                    onClick={() => { if (!sendingAllEmails) setIsEmailAllModalOpen(false); }}
                    className="absolute inset-0 w-full h-full bg-overlay"
                />

                <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 24 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Email Invoice to All"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ── Header with accent bar ── */}
                        <div className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-border">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-primary/70" />
                                <h2 className="truncate text-base font-semibold sm:text-lg text-foreground">
                                    Email Invoice to All
                                </h2>
                            </div>
                            <button
                                onClick={() => !sendingAllEmails && setIsEmailAllModalOpen(false)}
                                disabled={sendingAllEmails}
                                aria-label="Close dialog"
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                            >
                                <HiOutlineXMark className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ── Body ── */}
                        <div className="relative z-10 px-4 py-4 sm:px-6 sm:py-5 max-h-[82dvh] overflow-y-auto space-y-4">
                            <p className="text-sm text-muted-foreground -mt-1">
                                Select the billing month to send
                            </p>

                            {/* Month + Year selects */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="email-all-month" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Month
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="email-all-month"
                                            value={selectedMonth}
                                            onChange={e => setSelectedMonth(Number(e.target.value))}
                                            disabled={sendingAllEmails}
                                            className="w-full appearance-none px-3 py-2.5 pr-9 text-sm font-medium rounded-lg border border-input bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {MONTHS.map((m, i) => (
                                                <option key={m} value={i + 1}>{m}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground">
                                            <HiOutlineChevronDown className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="email-all-year" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Year
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="email-all-year"
                                            value={selectedYear}
                                            onChange={e => setSelectedYear(Number(e.target.value))}
                                            disabled={sendingAllEmails}
                                            className="w-full appearance-none px-3 py-2.5 pr-9 text-sm font-medium rounded-lg border border-input bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground">
                                            <HiOutlineChevronDown className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Selected period preview chip */}
                            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-primary/10 border-l-4 border-primary border border-primary/20">
                                <HiOutlineCalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
                                <p className="text-xs font-semibold text-primary">
                                    Sending invoices for{' '}
                                    <span className="font-bold">{MONTHS[selectedMonth - 1]} {selectedYear}</span>
                                </p>
                            </div>

                            {/* Irreversibility warning */}
                            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-warning-bg border-l-4 border-warning border border-warning-border">
                                <HiOutlineExclamationTriangle className="w-4 h-4 text-warning-text flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-warning-text leading-relaxed">
                                    This will email a PDF invoice to every active member. Emails cannot be recalled once sent.
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    id="email-all-cancel"
                                    onClick={() => setIsEmailAllModalOpen(false)}
                                    disabled={sendingAllEmails}
                                    className="touch-target flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-muted text-foreground transition-[transform,opacity,background,border-color] duration-[var(--duration-base)] ease-[var(--ease-out)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    id="email-all-confirm"
                                    onClick={handleEmailAll}
                                    disabled={sendingAllEmails}
                                    className="touch-target flex-[1.3] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-gradient-to-br from-primary to-primary/70 hover:brightness-90 shadow-md hover:shadow-lg transition-[transform,opacity,background,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                                >
                                    {sendingAllEmails
                                        ? <Spinner size="sm" color="current" />
                                        : <HiOutlineEnvelope className="w-4 h-4 flex-shrink-0" />}
                                    <span>{sendingAllEmails ? 'Sending…' : 'Send Invoices'}</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
            )}
            </AnimatePresence>,
            document.body
            )}

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