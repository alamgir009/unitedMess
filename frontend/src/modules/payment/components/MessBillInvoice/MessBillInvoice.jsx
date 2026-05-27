import React, { useState, useEffect, useMemo, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import PrintInvoice from './PrintInvoice';
import { useDownloadInvoice } from './useDownloadInvoice';
import invoiceService from '../../services/invoice.service';
import paymentService from '../../services/payment.service';
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
    HiOutlineShieldCheck,
    HiOutlineDevicePhoneMobile,
    HiOutlineChevronDown,
    HiOutlineClipboard,
    HiOutlineCheck,
    HiOutlinePencil,
    HiOutlineArrowRight,
    HiOutlineArrowLeft,
    HiOutlinePhoto,
} from 'react-icons/hi2';
import { SiGooglepay } from 'react-icons/si';
import { BsCreditCard2Front } from 'react-icons/bs';
import { Spinner } from '@/shared/components/ui';

/* ────────────────────────────────────────
   UTILITIES
   ──────────────────────────────────────── */
const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const nowDate = new Date();
const INV_MONTH = nowDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
const INV_DATE = nowDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const INV_NO = `UM-${nowDate.getFullYear()}${String(nowDate.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;

/* ────────────────────────────────────────
   SUB-COMPONENTS (memoized)
   ──────────────────────────────────────── */

/** Premium card for summary statistics */
const StatCard = memo(({ icon: Icon, label, value, subLabel, accent = false }) => (
    <div
        className={`flex-1 min-w-[150px] p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
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
    isSendingEmail,
    onSendEmail,
    paymentStatus = 'pending',
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

    const basePayable = data.payableAmount ?? 0;
    const finalPayable = basePayable;
    const isRefund = useMemo(() => finalPayable < 0, [finalPayable]);
    const displayAmt = useMemo(() => Math.abs(finalPayable), [finalPayable]);
    const isPaid = paymentStatus === 'success';
    const isPartiallyPaid = paymentStatus === 'partially_paid';

    const paidAmount = paymentRecord?.paidAmount ?? 0;
    const totalPayable = paymentRecord?.totalPayable ?? finalPayable;
    const remainingAmount = paymentRecord?.remainingAmount ?? Math.max(0, totalPayable - paidAmount);
    const paidPercent = totalPayable > 0 ? Math.min(100, Math.round((paidAmount / totalPayable) * 100)) : 0;

    // Expand/collapse state
    const [isExpanded, setIsExpanded] = useState(false);

    // PDF / Email handling
    const invoiceRef = useRef(null);
    const printRef = useRef(null);
    const { isDownloading, downloadPDF, generatePDFBase64 } = useDownloadInvoice();
    const [sendingEmail, setSendingEmail] = useState(false);

    // ── Payment Modal States ──
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payStep, setPayStep] = useState(1);
    const [payableMonths, setPayableMonths] = useState([]);
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [loadingMonths, setLoadingMonths] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('upi'); // 'upi' = manual upi, 'razorpay' = online
    const [upiConfig, setUpiConfig] = useState(null);
    const [loadingUpi, setLoadingUpi] = useState(false);
    const [utr, setUtr] = useState('');
    const [submittingUpi, setSubmittingUpi] = useState(false);
    const [qrCodeError, setQrCodeError] = useState(false);

    // Admin configuration editing states
    const [isAdminUpiEdit, setIsAdminUpiEdit] = useState(false);
    const [editUpiId, setEditUpiId] = useState('');
    const [editMerchantName, setEditMerchantName] = useState('');
    const [qrFile, setQrFile] = useState(null);
    const [savingUpiConfig, setSavingUpiConfig] = useState(false);

    // Load payable months
    const fetchMonths = async () => {
        setLoadingMonths(true);
        try {
            const res = await paymentService.getPayableMonths();
            if (res?.success && Array.isArray(res?.data)) {
                // Keep only unpaid, partially paid, or pending verification months
                setPayableMonths(res.data);
                
                // Pre-select current month if it is unpaid
                const activeMonthName = data?.monthName || displayMonth;
                const activeMonthData = res.data.find(m => m.monthName === activeMonthName);
                if (activeMonthData && (activeMonthData.status === 'UNPAID' || activeMonthData.status === 'PARTIALLY_PAID')) {
                    setSelectedMonths([activeMonthName]);
                } else {
                    // Otherwise select the first available unpaid month
                    const firstUnpaid = res.data.find(m => m.status === 'UNPAID' || m.status === 'PARTIALLY_PAID');
                    if (firstUnpaid) {
                        setSelectedMonths([firstUnpaid.monthName]);
                    }
                }
            }
        } catch (err) {
            toast.error('Failed to load payable months');
        } finally {
            setLoadingMonths(false);
        }
    };

    // Load UPI configuration
    const fetchUpiDetails = async () => {
        setLoadingUpi(true);
        setQrCodeError(false);
        try {
            const res = await paymentService.getUpiConfig();
            if (res?.success) {
                setUpiConfig(res.data);
                setEditUpiId(res.data.upiId || '');
                setEditMerchantName(res.data.merchantName || '');
            }
        } catch (err) {
            toast.error('Failed to load UPI configuration');
        } finally {
            setLoadingUpi(false);
        }
    };

    // Open checkout modal flow
    const handleOpenPaymentFlow = () => {
        setIsPayModalOpen(true);
        setPayStep(1);
        setUtr('');
        setSelectedMonths([]);
        fetchMonths();
        fetchUpiDetails();
    };

    // Close checkout modal flow
    const handleClosePaymentFlow = () => {
        setIsPayModalOpen(false);
        setPayStep(1);
        setUtr('');
        setSelectedMonths([]);
        setIsAdminUpiEdit(false);
        setQrFile(null);
    };

    // Toggle month selection
    const handleToggleMonth = (monthName) => {
        if (selectedMonths.includes(monthName)) {
            setSelectedMonths(selectedMonths.filter(m => m !== monthName));
        } else {
            setSelectedMonths([...selectedMonths, monthName]);
        }
    };

    // calculated total sum
    const selectedTotalPayable = useMemo(() => {
        return payableMonths
            .filter(m => selectedMonths.includes(m.monthName))
            .reduce((sum, m) => sum + m.remainingAmount, 0);
    }, [payableMonths, selectedMonths]);

    // Handle submit UTR manual reference
    const handleSubmitUtr = async () => {
        if (!utr.trim()) {
            toast.error('Please enter the Transaction ID (UTR)');
            return;
        }
        if (!/^[a-zA-Z0-9]{8,20}$/.test(utr.trim())) {
            toast.error('Invalid Transaction ID format. Must be 8-20 alphanumeric characters.');
            return;
        }
        setSubmittingUpi(true);
        try {
            const res = await paymentService.submitUpiManual({
                months: selectedMonths,
                transactionId: utr.trim(),
                remarks: `Manual UPI payment reference submission`
            });
            if (res?.success) {
                toast.success('Payment submitted successfully! Pending verification.');
                setPayStep(4); // Success screen
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Failed to submit payment reference');
        } finally {
            setSubmittingUpi(false);
        }
    };

    // Handle save UPI configuration (Admin only)
    const handleUpdateUpiConfig = async (e) => {
        e.preventDefault();
        if (!editUpiId) {
            toast.error('UPI ID is required');
            return;
        }
        if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(editUpiId)) {
            toast.error('Invalid UPI ID format. Expected format: user@bank');
            return;
        }
        setSavingUpiConfig(true);
        try {
            const configRes = await paymentService.updateUpiConfig({
                upiId: editUpiId,
                merchantName: editMerchantName
            });

            if (qrFile && configRes?.success) {
                const formData = new FormData();
                formData.append('qrcode', qrFile);
                await paymentService.uploadQrCode(formData);
            }

            toast.success('UPI configuration updated successfully!');
            setIsAdminUpiEdit(false);
            setQrFile(null);
            fetchUpiDetails();
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Failed to save UPI config');
        } finally {
            setSavingUpiConfig(false);
        }
    };

    // Proceed with Razorpay payment
    const handleRazorpayProceed = async () => {
        if (typeof onPayNow === 'function') {
            setIsPayModalOpen(false); // Close before launching SDK checkout
            onPayNow(selectedTotalPayable, 'mess_bill', selectedMonths);
        }
    };

    const handleDownloadPDF = () => {
        downloadPDF({
            printRef,
            fileName: INV_NO,
            title: `Invoice ${INV_NO}`,
            subject: `Mess Bill - ${displayMonth}`,
        });
    };

    const handleSendEmail = async () => {
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
            className="relative mx-auto w-full max-w-none rounded-3xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-lg dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/5 transition-all duration-300"
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
                        {INV_NO}
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
            <div className={`px-4 md:px-6 py-6 mt-2 rounded-b-3xl ${isRefund ? 'bg-emerald-50/70 dark:bg-emerald-900/15' : 'bg-gray-50 dark:bg-gray-800/40'} border-t border-gray-200 dark:border-gray-800`}>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                            {isRefund ? 'Refund amount' : 'Total payable'}
                        </p>
                        <div className="flex items-baseline gap-3">
                            <span className={`text-3xl md:text-4xl font-bold tabular-nums ${isRefund ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                                ₹{fmt(displayAmt)}
                            </span>
                            {isRefund && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-700/50">
                                    <HiOutlineArrowTrendingDown className="w-4 h-4" /> Refund
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Status badge */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border self-start sm:self-auto ${
                        isPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300' :
                        isPartiallyPaid ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300' :
                        isRefund ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300' :
                        'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300'
                    }`}>
                        {isPaid ? <HiOutlineCheckCircle className="w-4 h-4" /> :
                         isPartiallyPaid ? <HiOutlineCurrencyRupee className="w-4 h-4" /> :
                         isRefund ? <HiOutlineArrowTrendingDown className="w-4 h-4" /> :
                         <HiOutlineCurrencyRupee className="w-4 h-4" />}
                        <span>{isPaid ? 'Paid' : isPartiallyPaid ? 'Partially Paid' : isRefund ? 'Refund' : 'Due'}</span>
                    </div>
                </div>

                {/* ── Action Buttons ── */}
                <div className="space-y-4">
                    {isPaid ? (
                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800 backdrop-blur-sm">
                            <HiOutlineCheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Payment Successful!</p>
                                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">₹{fmt(displayAmt)} received. Invoice is final.</p>
                            </div>
                        </div>
                    ) : isPartiallyPaid ? (
                        <>
                            <div className="w-full">
                                <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                    <span>Paid: ₹{fmt(paidAmount)}</span>
                                    <span>{paidPercent}%</span>
                                </div>
                                <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${paidPercent}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-inner"
                                    />
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-900/25 border border-amber-200 dark:border-amber-700 backdrop-blur-sm">
                                <HiOutlineCurrencyRupee className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200">₹{fmt(remainingAmount)} remaining</p>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">Complete your payment to settle the mess bill.</p>
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleOpenPaymentFlow}
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
                            >
                                <HiOutlineCurrencyRupee className="w-5 h-5" />
                                <span>Pay Remaining Balance</span>
                            </motion.button>
                        </>
                    ) : isRefund ? (
                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800 backdrop-blur-sm">
                            <HiOutlineArrowTrendingDown className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">You have a refund!</p>
                                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">₹{fmt(displayAmt)} will be credited. Contact admin.</p>
                            </div>
                        </div>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleOpenPaymentFlow}
                            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
                        >
                            <span>Pay Bill</span>
                            <HiOutlineShieldCheck className="w-4 h-4 opacity-80" />
                        </motion.button>
                    )}

                    <div className="flex gap-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isDownloading}
                            onClick={handleDownloadPDF}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/60 backdrop-blur-md text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            {isDownloading ? <Spinner size="sm" color="current" /> : <HiOutlineArrowDownTray className="w-4 h-4" />}
                            <span className="hidden sm:inline">Download</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={!!(isSendingEmail || sendingEmail)}
                            onClick={handleSendEmail}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/60 backdrop-blur-md text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            {(isSendingEmail || sendingEmail) ? <Spinner size="sm" color="current" /> : <HiOutlineEnvelope className="w-4 h-4" />}
                            <span className="hidden sm:inline">Email</span>
                        </motion.button>
                    </div>
                </div>

                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-5 text-center">
                    System‑generated invoice for {displayMonth}. For disputes, contact your mess admin.
                </p>
            </div>

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
                        invoiceNo={INV_NO}
                    />
                </div>
            </div>

            {/* ── STEP-BASED PREMIUM CHECKOUT FLOW MODAL ── */}
            <AnimatePresence>
                {isPayModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClosePaymentFlow}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />

                        {/* Modal Container */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl overflow-hidden z-10 max-h-[92vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {isAdminUpiEdit ? 'Configure UPI Details' : 'Secure Mess Bill Checkout'}
                                    </h3>
                                    {!isAdminUpiEdit && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Step {payStep} of 3 · Fintech-Grade Billing
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={handleClosePaymentFlow}
                                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <HiOutlineXMark className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-6">
                                {isAdminUpiEdit ? (
                                    /* Admin UPI Configuration Form */
                                    <form onSubmit={handleUpdateUpiConfig} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">UPI ID</label>
                                            <input
                                                type="text"
                                                value={editUpiId}
                                                onChange={(e) => setEditUpiId(e.target.value)}
                                                placeholder="e.g. name@upi"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Merchant/Admin Name</label>
                                            <input
                                                type="text"
                                                value={editMerchantName}
                                                onChange={(e) => setEditMerchantName(e.target.value)}
                                                placeholder="e.g. United Mess Account"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">QR Code Image</label>
                                            <div className="flex items-center justify-center w-full">
                                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <HiOutlinePhoto className="w-8 h-8 text-slate-400 mb-2" />
                                                        <p className="text-xs text-slate-500 font-semibold">
                                                            {qrFile ? qrFile.name : 'Click to upload QR code'}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-1">PNG, JPG or WEBP (Max 2MB)</p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => setQrFile(e.target.files[0])}
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsAdminUpiEdit(false)}
                                                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={savingUpiConfig}
                                                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/10 hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                                            >
                                                {savingUpiConfig ? <Spinner size="sm" color="white" /> : 'Save Details'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    /* Main Step Flow */
                                    <>
                                        {/* Stepper Indicators */}
                                        {payStep <= 3 && (
                                            <div className="flex items-center justify-between mb-8 max-w-xs mx-auto">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${payStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>1</div>
                                                    <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Months</span>
                                                </div>
                                                <div className={`flex-1 h-0.5 mx-2 transition-colors ${payStep >= 2 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`} />
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${payStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>2</div>
                                                    <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Method</span>
                                                </div>
                                                <div className={`flex-1 h-0.5 mx-2 transition-colors ${payStep >= 3 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`} />
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${payStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>3</div>
                                                    <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Pay</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 1: MONTH SELECTION */}
                                        {payStep === 1 && (
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Select billing month(s) to settle</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Select one or more months. Outstanding Carry-overs must be cleared.</p>
                                                </div>

                                                {loadingMonths ? (
                                                    <div className="flex justify-center py-10">
                                                        <Spinner size="lg" />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                                        {payableMonths.length === 0 ? (
                                                            <div className="text-center py-6 text-xs text-slate-500">No payable months loaded from server.</div>
                                                        ) : (
                                                            payableMonths.map((m) => {
                                                                const isAlreadyPaid = m.status === 'PAID';
                                                                const isPendingVer = m.status === 'PENDING_VERIFICATION';
                                                                const isSelected = selectedMonths.includes(m.monthName);
                                                                const isSelectable = !isAlreadyPaid && !isPendingVer;

                                                                return (
                                                                    <div
                                                                        key={m.monthName}
                                                                        onClick={() => isSelectable && handleToggleMonth(m.monthName)}
                                                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                                                            isSelected
                                                                                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                                                                                : 'border-slate-100 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-800'
                                                                        } ${isSelectable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                disabled={!isSelectable}
                                                                                onChange={() => {}} // Controlled by parent div click
                                                                                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                                                            />
                                                                            <div>
                                                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.monthName}</p>
                                                                                <p className="text-xs text-slate-400 mt-0.5">₹{fmt(m.remainingAmount)} remaining</p>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                                                                isAlreadyPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20' :
                                                                                isPendingVer ? 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20' :
                                                                                m.status === 'PARTIALLY_PAID' ? 'bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-950/20' :
                                                                                'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800'
                                                                            }`}>
                                                                                {isAlreadyPaid ? 'Paid' : isPendingVer ? 'Verification Pending' : m.status === 'PARTIALLY_PAID' ? 'Partial' : 'Unpaid'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                )}

                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 flex items-center justify-between border border-slate-100 dark:border-slate-800 mt-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selected Total</p>
                                                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">₹{fmt(selectedTotalPayable)}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setPayStep(2)}
                                                        disabled={selectedMonths.length === 0}
                                                        className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/10 hover:shadow-lg disabled:opacity-50 transition-all duration-200"
                                                    >
                                                        <span>Next</span>
                                                        <HiOutlineArrowRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 2: PAYMENT METHOD SELECTION */}
                                        {payStep === 2 && (
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Select Payment Gateway</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Choose online secure gateway or manual direct bank transfer.</p>
                                                </div>

                                                <div className="space-y-3">
                                                    {/* Razorpay Option */}
                                                    <div
                                                        onClick={() => setSelectedMethod('razorpay')}
                                                        className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                                                            selectedMethod === 'razorpay'
                                                                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                                                                : 'border-slate-100 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-800'
                                                        }`}
                                                    >
                                                        <div className={`p-3 rounded-xl ${selectedMethod === 'razorpay' ? 'bg-indigo-150 text-indigo-700' : 'bg-slate-100 text-slate-500'} dark:bg-slate-800`}>
                                                            <BsCreditCard2Front className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-250">Razorpay Secure Online</p>
                                                                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase dark:bg-indigo-950/25">Instant</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-1">Cards, Netbanking, GooglePay, PhonePe with automated instant updates.</p>
                                                        </div>
                                                    </div>

                                                    {/* Manual UPI Option */}
                                                    <div
                                                        onClick={() => setSelectedMethod('upi')}
                                                        className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                                                            selectedMethod === 'upi'
                                                                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                                                                : 'border-slate-100 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-800'
                                                        }`}
                                                    >
                                                        <div className={`p-3 rounded-xl ${selectedMethod === 'upi' ? 'bg-indigo-150 text-indigo-700' : 'bg-slate-100 text-slate-500'} dark:bg-slate-800`}>
                                                            <SiGooglepay className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-250">Manual UPI Transfer</p>
                                                            <p className="text-xs text-slate-500 mt-1">Transfer directly to Mess Admin's UPI ID/QR and submit UTR reference.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3 pt-4">
                                                    <button
                                                        onClick={() => setPayStep(1)}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-3.5 px-5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all"
                                                    >
                                                        <HiOutlineArrowLeft className="w-4 h-4" />
                                                        <span>Back</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setPayStep(3)}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-3.5 px-5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all"
                                                    >
                                                        <span>Continue</span>
                                                        <HiOutlineArrowRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 3: PAY & CHECKOUT */}
                                        {payStep === 3 && (
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Confirm checkout details</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Total settlement for: {selectedMonths.join(', ')}</p>
                                                </div>

                                                {selectedMethod === 'razorpay' ? (
                                                    /* Razorpay Checkout Proceed */
                                                    <div className="p-5 rounded-2xl bg-indigo-50/20 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-center space-y-4">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payable Online Amount</p>
                                                            <p className="text-3xl font-black text-slate-900 dark:text-white">₹{fmt(selectedTotalPayable)}</p>
                                                        </div>
                                                        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                                                            You will be redirected to the secure Razorpay Payment Gateway to complete your online card, netbanking, or UPI transaction.
                                                        </p>

                                                        <button
                                                            onClick={handleRazorpayProceed}
                                                            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all duration-200"
                                                        >
                                                            <HiOutlineShieldCheck className="w-5 h-5 text-indigo-200" />
                                                            <span>Pay Online ₹{fmt(selectedTotalPayable)}</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    /* Manual UPI Transfer Checkout */
                                                    <div className="space-y-4">
                                                        {loadingUpi ? (
                                                            <div className="flex justify-center py-10">
                                                                <Spinner size="lg" />
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                {/* QR Code and details */}
                                                                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-850/20 space-y-4">
                                                                    <div className="flex flex-col items-center text-center space-y-2">
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payable Direct UPI Amount</p>
                                                                        <p className="text-3xl font-black text-slate-900 dark:text-white">₹{fmt(selectedTotalPayable)}</p>
                                                                    </div>

                                                                    {upiConfig ? (
                                                                        <>
                                                                            {/* QR Image display */}
                                                                            {upiConfig.qrCodeUrl && !qrCodeError ? (
                                                                                <div className="flex flex-col items-center">
                                                                                    <img
                                                                                        src={upiConfig.qrCodeUrl}
                                                                                        alt="Direct UPI QR Code"
                                                                                        onError={() => setQrCodeError(true)}
                                                                                        className="w-48 h-48 rounded-xl object-contain border border-slate-100 dark:border-slate-800 bg-white p-1"
                                                                                    />
                                                                                    <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Scan QR Code</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="p-3 text-center text-xs text-slate-400 border border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50/20">
                                                                                    QR Code image not available. Please use UPI ID below.
                                                                                </div>
                                                                            )}

                                                                            {/* UPI ID block */}
                                                                            <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                                                                                <div className="min-w-0 pr-2">
                                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">UPI ID</p>
                                                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 select-all truncate">{upiConfig.upiId}</p>
                                                                                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{upiConfig.merchantName}</p>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => copyToClipboard(upiConfig.upiId)}
                                                                                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-white transition-colors"
                                                                                >
                                                                                    <HiOutlineClipboard className="w-4.5 h-4.5" />
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="text-center py-4 text-xs text-slate-400 border rounded-xl">
                                                                            UPI ID details not configured by administrator.
                                                                        </div>
                                                                    )}

                                                                    {/* Admin configuration portal button */}
                                                                    {isAdmin && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setIsAdminUpiEdit(true)}
                                                                            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 transition-colors"
                                                                        >
                                                                            <HiOutlinePencil className="w-3.5 h-3.5" />
                                                                            <span>Configure UPI ID & QR (Admin)</span>
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Verification manual instructions & UTR input */}
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Transaction ID (UTR / Ref No.)</label>
                                                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                                                                            Paste the 12-digit transaction ID from your GooglePay/PhonePe/Paytm payment details window.
                                                                        </p>
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        value={utr}
                                                                        onChange={(e) => setUtr(e.target.value)}
                                                                        placeholder="e.g. 123456789012"
                                                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                                                                        required
                                                                    />

                                                                    <button
                                                                        onClick={handleSubmitUtr}
                                                                        disabled={submittingUpi || !utr.trim()}
                                                                        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/10 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                    >
                                                                        {submittingUpi ? <Spinner size="sm" color="white" /> : <HiOutlineCheck className="w-4 h-4" />}
                                                                        <span>Submit UTR Reference</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Back button */}
                                                <div className="pt-2">
                                                    <button
                                                        onClick={() => setPayStep(2)}
                                                        className="w-full flex items-center justify-center gap-1.5 py-3 px-5 rounded-xl text-sm font-semibold border border-slate-250 dark:border-slate-850 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all"
                                                    >
                                                        <HiOutlineArrowLeft className="w-4 h-4" />
                                                        <span>Back</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 4: SUCCESS CONFIRMATION */}
                                        {payStep === 4 && (
                                            <motion.div
                                                initial={{ scale: 0.95, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="text-center py-8 space-y-4"
                                            >
                                                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                                                    <HiOutlineCheckCircle className="w-10 h-10 animate-bounce" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">Transaction Reference Submitted!</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 px-6 leading-relaxed">
                                                        Your transaction reference UTR has been logged. The administrator will review and verify your payment shortly.
                                                    </p>
                                                </div>
                                                <div className="pt-6">
                                                    <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-850 px-4 py-2.5 rounded-full border border-slate-100 dark:border-slate-800">
                                                        <Spinner size="xs" />
                                                        <span>Reloading billing dashboard…</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default MessBillInvoice;