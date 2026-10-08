import { useState, useMemo, memo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import invoiceService from '../../services/invoice.service';
import {
    HiOutlineCurrencyRupee,
    HiOutlineShoppingCart,
    HiOutlineUserGroup,
    HiOutlineWrenchScrewdriver,
    HiOutlineBeaker,
    HiOutlineUsers,
    HiOutlineStar,
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
    HiOutlineCalendarDays,
    HiOutlineXMark,
} from 'react-icons/hi2';
import { Spinner, Button } from '@/shared/components/ui';
import { fmt } from '@/core/utils/helpers/currency.helper';

const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

/* ── Status chip — glyph + label + token pair (never colour alone).
      Mirrors pdf.service.js CHIPS / InvoicePreview. ── */
const CHIPS = {
    pending:  { glyph: '!',      label: 'DUE',        cls: 'bg-warning-bg text-warning-text border-warning-border' },
    partial:  { glyph: '\u2026', label: 'PARTIAL',    cls: 'bg-warning-bg text-warning-text border-warning-border' },
    success:  { glyph: '\u2713', label: 'PAID',       cls: 'bg-success-bg text-success-text border-success-border' },
    refund:   { glyph: '\u21A9', label: 'REFUND DUE', cls: 'bg-refund-bg text-refund-text border-refund-border' },
    refunded: { glyph: '\u21BA', label: 'REFUNDED',   cls: 'bg-refund-bg text-refund-text border-refund-border' },
};

/* ── Money display: 2 decimals, true minus sign (mirrors pdf.service.js) ── */
const money = (n) => {
    const v = Math.round((Number(n) + Number.EPSILON) * 100) / 100;
    return `${v < 0 ? '\u2212' : ''}\u20B9${fmt(Math.abs(v), 2, 2)}`;
};
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* ── IST display — timestamps are UTC; display pinned to Asia/Kolkata
      (pattern: email.service.js:644 — never browser-local time) ── */
const istFull = (d = new Date()) => {
    try {
        const date = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(d);
        const time = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(d).toUpperCase();
        return `${date}, ${time} IST`;
    } catch {
        return null;
    }
};

/* Human labels for Payment.paymentMethod — kept in sync with
   email.service.js:15-20 (PAYMENT_METHOD_LABELS) and pdf.service.js. */
const METHOD_LABELS = {
    razorpay: 'Online (Razorpay)',
    online: 'Online Transfer',
    upi_manual: 'UPI (Manual)',
    cash: 'Cash',
};

/* Mask a UPI VPA for display — ali@okaxis → ali•••@okaxis (mirrors PDF) */
const maskVpa = (vpa) => {
    const [local, host] = String(vpa).split('@');
    if (!host) return String(vpa);
    return `${local.slice(0, Math.min(3, local.length))}\u2022\u2022\u2022@${host}`;
};

/* ── Key-value row (PAYMENT / REFUND DETAILS blocks) ── */
const KeyRow = memo(({ label, value, mono = false }) => (
    <div className="flex items-start justify-between gap-3 py-0.5">
        <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
        <span className={`text-[11px] text-foreground text-right min-w-0 break-all ${mono ? 'font-mono font-medium select-all' : 'font-medium'}`}>
            {value}
        </span>
    </div>
));
KeyRow.displayName = 'KeyRow';

/* ── Keyed detail block (mirrors pdf.service.js drawKeyedBlock) ── */
const KeyedBlock = memo(({ title, rows }) => (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground border-b border-border/60 pb-1.5">
            {title}
        </p>
        <div className="pt-1.5 space-y-0.5">
            {rows.map((r) => (
                <KeyRow key={r.label} label={r.label} value={r.value} mono={r.mono} />
            ))}
        </div>
    </div>
));
KeyedBlock.displayName = 'KeyedBlock';

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
    hidePayButton = false,
    autoExpand = false,
    userId,
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

    const [isExpanded, setIsExpanded] = useState(autoExpand);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingAllEmails,    setSendingAllEmails]    = useState(false);
    const [isEmailAllModalOpen, setIsEmailAllModalOpen] = useState(false);
    const [selectedMonth,       setSelectedMonth]       = useState(1);
    const [selectedYear,        setSelectedYear]        = useState(() => new Date().getFullYear());
    const invoiceRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

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

    const issuedAt = useMemo(() => istFull(new Date()), []);

    if (!data) return null;

    const {
        grandTotalMarketAmount = 0,
        grandTotalMeal = 0,
        grandTotalGuest = 0,
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
        guestMealAmount = 0,
    } = userStats;

    const isPaid = paymentStatus === 'success';
    const isPartiallyPaid = paymentStatus === 'partially_paid';

    const paidAmount = paymentRecord?.paidAmount ?? 0;
    const totalPayable = paymentRecord?.totalPayable ?? finalPayable;

    /* ── Status chip — same precedence as pdf.service.js: settled money >
          partial > refund sign > unpaid. Colour lives ONLY in the chip. ── */
    const refundSettled = !!data?.refundSettled;
    const chipKey = isPaid ? 'success'
        : isPartiallyPaid ? 'partial'
            : isRefund ? (refundSettled ? 'refunded' : 'refund')
                : 'pending';
    const chip = CHIPS[chipKey];

    /* ── Ledger — displayed rows reconcile to the displayed total
          (mirrors pdf.service.js:485-497) ── */
    const dispSum = r2(r2(costOfMeals) + r2(waterBill) + r2(cookingCharge)
        + (guestMeal > 0 ? r2(guestMealAmount) : 0) + r2(platformFee || 0));
    const market = r2(totalMarketAmount);
    const rounding = r2(finalPayable - (dispSum - market));

    /* ── PAYMENT DETAILS rows — annotated Payment data only ── */
    const paymentMethodVal = paymentRecord?._paymentMethod || paymentRecord?.paymentMethod;
    const paymentRows = [];
    if (paymentMethodVal) {
        paymentRows.push({ label: 'Paid at', value: (paymentRecord?.paymentDate && istFull(new Date(paymentRecord.paymentDate))) || '\u2014' });
        paymentRows.push({ label: 'Method', value: METHOD_LABELS[paymentMethodVal] || paymentMethodVal });
        const ref = paymentRecord?.utr || paymentRecord?.transactionId;
        if (ref) paymentRows.push({ label: paymentRecord?.utr ? 'UTR' : 'Transaction ID', value: ref, mono: true });
        if (paymentRecord?._payeeVpa) paymentRows.push({ label: 'Payee', value: maskVpa(paymentRecord._payeeVpa) });
        if (paymentRecord?._verifiedByName) paymentRows.push({ label: 'Verified by', value: paymentRecord._verifiedByName });
        else if (paymentRecord?._recordedByName) paymentRows.push({ label: 'Recorded by', value: paymentRecord._recordedByName });
    }

    /* ── REFUND DETAILS rows — shown when the refund payout is recorded ── */
    const refundRows = refundSettled
        ? [
            { label: 'Refund amount', value: money(data._refundAmount ?? displayAmt) },
            { label: 'Refunded on', value: (data._refundAt && istFull(new Date(data._refundAt))) || '\u2014' },
            { label: 'Reference', value: data._refundReference || '\u2014', mono: true },
        ]
        : [];

    const handleOpenPaymentFlow = () => {
        if (typeof onPayNow === 'function') {
            onPayNow(displayMonth);
        }
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            await invoiceService.downloadInvoice(
                billingNums.year,
                billingNums.month,
                userId
            );
            toast.success('Invoice downloaded');
        } catch (err) {
            toast.error('Failed to download invoice');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSendEmail = async () => {
        setSendingEmail(true);
        try {
            await invoiceService.sendInvoiceEmail(
                billingNums.year,
                billingNums.month,
                userId
            );
            toast.success('Invoice sent to your email!');
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Failed to send invoice email');
        } finally {
            setSendingEmail(false);
        }
    };

    const statusLabel = chip.label;
    const statusCls   = chip.cls;

    return (
        <motion.div
            ref={invoiceRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="invoice-print relative mx-auto w-full max-w-none rounded-xl bg-card border border-border/50 overflow-hidden shadow-sm transition-all duration-200 ease-out transform-gpu hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md motion-reduce:hover:translate-y-0 contain-layout"
        >
            {/* ═══════════════════════════════════════════════════
                FLAT LAYOUT — autoExpand mode
                ═══════════════════════════════════════════════════ */}
            {autoExpand && (
                <div className="px-6 md:px-8 pt-6 md:pt-8 pb-6">
                    {/* ── Stat boxes ── */}
                    <div className="flex gap-3 mb-6">
                        <div className="flex-1 p-4 bg-muted/50 rounded-lg border border-border">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Market Total (All)</p>
                            <p className="text-xl font-bold text-foreground tabular-nums">{money(grandTotalMarketAmount)}</p>
                        </div>
                        <div className="flex-1 p-4 bg-muted/50 rounded-lg border border-border">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Meals (All)</p>
                            <p className="text-xl font-bold text-foreground tabular-nums">{fmt(grandTotalMeal)}</p>
                            {grandTotalGuest > 0 && (
                                <p className="text-[10px] text-muted-foreground/60 tabular-nums mt-0.5">{fmt(grandTotalMeal - grandTotalGuest)} + {fmt(grandTotalGuest)} Guest</p>
                            )}
                        </div>
                        <div className="flex-1 p-4 bg-muted/50 rounded-lg border border-border">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{isRefund ? (refundSettled ? 'Refunded' : 'Refund Due') : 'Your Payable'}</p>
                            <p className="text-xl font-bold text-foreground tabular-nums">{money(finalPayable)}</p>
                        </div>
                    </div>

                    {/* ── Ledger — every line reconciles to totalPayable ── */}
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground border-b border-border pb-2 mt-5 mb-0">Ledger</p>
                    <div className="flex justify-between items-center py-3 border-b border-border/60">
                        <div>
                            <p className="text-sm text-foreground">Meals</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">{fmt(totalMeal)} meals {'\u00d7'} {'\u20B9'}{fmt(adjustedMealCharge, 2, 2)}</p>
                        </div>
                        <p className="text-sm font-bold text-foreground tabular-nums">{money(costOfMeals)}</p>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border/60">
                        <p className="text-sm text-foreground">Water Bill</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">{money(waterBill)}</p>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border/60">
                        <p className="text-sm text-foreground">Cooking Charge</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">{money(cookingCharge)}</p>
                    </div>
                    {guestMeal > 0 && (
                        <div className="flex justify-between items-center py-3 border-b border-border/60">
                            <div>
                                <p className="text-sm text-foreground">Guest Meals</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">{guestMeal} meals {'\u00d7'} {'\u20B9'}{fmt(guestMealAmount / guestMeal, 2, 2)}</p>
                            </div>
                            <p className="text-sm font-bold text-foreground tabular-nums">{money(guestMealAmount)}</p>
                        </div>
                    )}
                    {(platformFee || 0) !== 0 && (
                        <div className="flex justify-between items-center py-3 border-b border-border/60">
                            <p className="text-sm text-foreground">Platform Fee</p>
                            <p className="text-sm font-bold text-foreground tabular-nums">{money(platformFee || 0)}</p>
                        </div>
                    )}

                    <div className="flex justify-between items-center py-3 border-b border-border/60">
                        <p className="text-sm font-semibold text-foreground">Subtotal</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">{money(dispSum)}</p>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border/60">
                        <div>
                            <p className="text-sm text-foreground">Less: Market spend you paid</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {market > 0 ? 'Credit \u2014 spend you settled directly' : 'No direct market spend recorded'}
                            </p>
                        </div>
                        <p className="text-sm font-bold text-foreground tabular-nums">{money(-market)}</p>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border/60">
                        <p className="text-sm text-foreground">Rounding off</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">{money(rounding)}</p>
                    </div>

                    {/* ── Total — neutral box; status colour only in the chip ── */}
                    <div className="mt-6 p-5 rounded-xl flex justify-between items-start gap-4 bg-muted/30 border border-border">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                {isRefund ? 'Total (Credit)' : 'Total Payable'}
                            </p>
                            <p className="text-3xl font-black tabular-nums text-foreground">
                                {money(finalPayable)}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${chip.cls}`}>
                                <span aria-hidden="true">{chip.glyph}</span>
                                <span>{chip.label}</span>
                            </span>
                            <div className="w-full min-w-[150px] space-y-1">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-[11px] text-muted-foreground">Paid</span>
                                    <span className="text-[11px] font-semibold text-foreground tabular-nums">{money(paidAmount)}</span>
                                </div>
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-[11px] text-muted-foreground">Balance due</span>
                                    <span className="text-[11px] font-semibold text-foreground tabular-nums">
                                        {isRefund ? '\u2014' : money(Math.max(0, totalPayable - paidAmount))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── PAYMENT / REFUND DETAILS — annotated data only ── */}
                    {paymentRows.length > 0 && (
                        <div className="mt-4">
                            <KeyedBlock title="Payment Details" rows={paymentRows} />
                        </div>
                    )}
                    {refundRows.length > 0 && (
                        <div className="mt-4">
                            <KeyedBlock title="Refund Details" rows={refundRows} />
                        </div>
                    )}

                    {/* ── Pay Now button ── */}
                    {!isPaid && !isRefund && !hidePayButton && (
                        <Button
                            type="button"
                            variant={isPartiallyPaid ? 'warning' : 'primary'}
                            fullWidth
                            disabled={isPaying}
                            onClick={handleOpenPaymentFlow}
                            className="no-print mt-5"
                        >
                            <span>{isPartiallyPaid ? 'Pay Remaining Balance' : 'Pay Bill'}</span>
                            {!isPartiallyPaid && <HiOutlineShieldCheck className="w-4 h-4 opacity-80" />}
                        </Button>
                    )}

                    {/* ── Download / Email ── */}
                    <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={isDownloading}
                            onClick={handleDownloadPDF}
                        >
                            {isDownloading ? <Spinner size="sm" color="current" /> : <HiOutlineArrowDownTray className="w-4 h-4 flex-shrink-0" />}
                            <span>Download</span>
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={sendingEmail}
                            onClick={handleSendEmail}
                        >
                            {sendingEmail ? <Spinner size="sm" color="current" /> : <HiOutlineEnvelope className="w-4 h-4 flex-shrink-0" />}
                            <span>Email</span>
                        </Button>
                    </div>

                    {/* ── Admin: Email to all ── */}
                    {isAdmin && (
                        <Button
                            type="button"
                            variant="outline"
                            fullWidth
                            disabled={sendingAllEmails}
                            onClick={openEmailAllModal}
                            className="no-print mt-3"
                        >
                            {sendingAllEmails ? <Spinner size="sm" color="current" /> : <HiOutlineUsers className="w-4 h-4 flex-shrink-0" />}
                            <span>{sendingAllEmails ? 'Sending to all members\u2026' : 'Email to all'}</span>
                        </Button>
                    )}

                    {/* ── Footer ── */}
                    <p className="text-[11px] text-muted-foreground mt-5 text-center leading-relaxed">
                        System-generated invoice for {displayMonth}. For disputes, contact your mess admin.
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-1 text-center">
                        United Mess {'\u00B7'} {invMeta.no} {'\u00B7'} Generated {issuedAt}
                    </p>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                COLLAPSED / EXPANDED LAYOUT — standalone mode
                ═══════════════════════════════════════════════════ */}
            {!autoExpand && (
            <>
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
                            {money(finalPayable)}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${statusCls}`}>
                            <span aria-hidden="true">{chip.glyph}</span>
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
                    <p className="text-xs text-muted-foreground">
                        Billing period <span className="font-semibold text-foreground">{displayMonth}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Issued on <span className="text-foreground">{issuedAt}</span>
                    </p>
                    {user?.name && <p className="text-sm font-semibold text-foreground">{user.name}</p>}
                    {user?.email && <p className="text-xs text-muted-foreground max-w-[220px] truncate">{user.email}</p>}
                </div>
            </div>

            {/* ── Summary Stats ── */}
            <div className="px-4 md:px-6 pt-6 pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard icon={HiOutlineShoppingCart} label="Market Total" value={money(grandTotalMarketAmount)} subLabel="All members" />
                    <StatCard icon={HiOutlineUsers} label="Total Meals" value={fmt(grandTotalMeal)} subLabel={grandTotalGuest > 0 ? `${fmt(grandTotalMeal - grandTotalGuest)} + ${fmt(grandTotalGuest)} Guest` : 'All members'} />
                    <StatCard icon={HiOutlineCurrencyRupee} label="Your Payable" value={money(finalPayable)} subLabel={isRefund ? (refundSettled ? 'Refunded' : 'Refund due') : 'Due now'} accent={false} />
                </div>
            </div>

            {/* ── Ledger — every line reconciles to totalPayable ── */}
            <div className="px-4 md:px-6 py-6 space-y-1">
                <SectionDivider label="Ledger" />
                <LineItem
                    icon={HiOutlineStar}
                    label="Meals"
                    value={money(costOfMeals)}
                    subText={`${fmt(totalMeal)} meals \u00d7 \u20B9${fmt(adjustedMealCharge, 2, 2)}`}
                />
                <LineItem icon={HiOutlineBeaker} label="Water Bill" value={money(waterBill)} />
                <LineItem icon={HiOutlineWrenchScrewdriver} label="Cooking Charge" value={money(cookingCharge)} />
                {guestMeal > 0 && (
                    <LineItem
                        icon={HiOutlineUserGroup}
                        label="Guest Meals"
                        subText={`${guestMeal} meals \u00d7 \u20B9${fmt(guestMealAmount / guestMeal, 2, 2)}`}
                        value={money(guestMealAmount)}
                    />
                )}
                {(platformFee || 0) !== 0 && (
                    <LineItem icon={HiOutlineReceiptPercent} label="Platform Fee" value={money(platformFee || 0)} />
                )}

                <LineItem icon={HiOutlineCurrencyRupee} label="Subtotal" value={money(dispSum)} accent />
                <LineItem
                    icon={HiOutlineArrowTrendingDown}
                    label="Less: Market spend you paid"
                    subText={market > 0 ? 'Credit \u2014 spend you settled directly' : 'No direct market spend recorded'}
                    value={money(-market)}
                />
                <LineItem icon={HiOutlineReceiptPercent} label="Rounding off" value={money(rounding)} />
            </div>

            {/* ── Total & Payment Area ── */}
            <div className={`px-4 md:px-6 pt-6 pb-8 mt-0 rounded-b-2xl border-t border-border ${
            isRefund
                ? 'bg-card'
                : 'bg-card'
            }`}>

            {/* ── Total — neutral container; status colour only in the chip ── */}
            <div className="flex items-start justify-between gap-4 p-4 md:p-5 rounded-2xl mb-5 border shadow-sm bg-muted/30 border-border">
                <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                    {isRefund ? 'Total (Credit)' : 'Total Payable'}
                </p>
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl md:text-4xl font-black tabular-nums leading-none text-foreground">
                    {money(finalPayable)}
                    </span>
                    {isPartiallyPaid && totalPayable > 0 && (
                    <span className="text-xs text-muted-foreground font-medium">
                        of {money(totalPayable)}
                    </span>
                    )}
                </div>
                </div>

                {/* ── Status chip + Paid / Balance due ── */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border select-none ${chip.cls}`}>
                        <span aria-hidden="true">{chip.glyph}</span>
                        <span>{chip.label}</span>
                    </span>
                    <div className="w-full min-w-[160px] space-y-1">
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-[11px] text-muted-foreground">Paid</span>
                            <span className="text-[11px] font-semibold text-foreground tabular-nums">{money(paidAmount)}</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-[11px] text-muted-foreground">Balance due</span>
                            <span className="text-[11px] font-semibold text-foreground tabular-nums">
                                {isRefund ? '\u2014' : money(Math.max(0, totalPayable - paidAmount))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PAYMENT / REFUND DETAILS — annotated data only ── */}
            {paymentRows.length > 0 && <KeyedBlock title="Payment Details" rows={paymentRows} />}
            {refundRows.length > 0 && <KeyedBlock title="Refund Details" rows={refundRows} />}

            {/* ── Premium Pay Now / Remaining Button ── */}
            {!isPaid && !isRefund && !hidePayButton && (
                <Button
                type="button"
                variant={isPartiallyPaid ? 'warning' : 'primary'}
                fullWidth
                disabled={isPaying}
                onClick={handleOpenPaymentFlow}
                className="no-print mb-3"
                >
                <span>{isPartiallyPaid ? 'Pay Remaining Balance' : 'Pay Bill'}</span>
                {!isPartiallyPaid && <HiOutlineShieldCheck className="w-4 h-4 opacity-80" />}
                </Button>
            )}

            {/* ── Download / Email actions ── */}
            <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <Button
                type="button"
                variant="secondary"
                disabled={isDownloading}
                onClick={handleDownloadPDF}
                >
                {isDownloading ? <Spinner size="sm" color="current" /> : <HiOutlineArrowDownTray className="w-4 h-4 flex-shrink-0" />}
                <span>Download</span>
                </Button>
                <Button
                type="button"
                variant="secondary"
                disabled={sendingEmail}
                onClick={handleSendEmail}
                >
                {sendingEmail ? <Spinner size="sm" color="current" /> : <HiOutlineEnvelope className="w-4 h-4 flex-shrink-0" />}
                <span>Email</span>
                </Button>
            </div>

            {/* ── Admin: Email to all members ── */}
            {isAdmin && (
                <Button
                type="button"
                variant="outline"
                fullWidth
                disabled={sendingAllEmails}
                onClick={openEmailAllModal}
                className="no-print mt-3"
                >
                {sendingAllEmails ? <Spinner size="sm" color="current" /> : <HiOutlineUsers className="w-4 h-4 flex-shrink-0" />}
                <span>{sendingAllEmails ? 'Sending to all members\u2026' : 'Email to all'}</span>
                </Button>
            )}

            {/* ── Footer disclaimer ── */}
            <p className="text-[11px] text-muted-foreground mt-5 text-center leading-relaxed">
                System-generated invoice for {displayMonth}. For disputes, contact your mess admin.
            </p>
            <p className="text-[11px] text-muted-foreground font-medium mt-1 text-center">
                United Mess {'\u00B7'} {invMeta.no} {'\u00B7'} Generated {issuedAt}
            </p>
            </div>

            </motion.div>
            )}
            </AnimatePresence>
            </>
            )}

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
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => !sendingAllEmails && setIsEmailAllModalOpen(false)}
                                disabled={sendingAllEmails}
                                aria-label="Close dialog"
                                iconOnly
                            >
                                <HiOutlineXMark className="w-5 h-5" />
                            </Button>
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
                            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-primary/10 border border-primary/20 border-l-[3px] border-l-primary">
                                <HiOutlineCalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
                                <p className="text-xs font-semibold text-primary">
                                    Sending invoices for{' '}
                                    <span className="font-bold">{MONTHS[selectedMonth - 1]} {selectedYear}</span>
                                </p>
                            </div>

                            {/* Irreversibility warning */}
                            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-warning-bg border border-warning-border border-l-[3px] border-l-warning">
                                <HiOutlineExclamationTriangle className="w-4 h-4 text-warning-text flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-warning-text leading-relaxed">
                                    This will email a PDF invoice to every active member. Emails cannot be recalled once sent.
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-1">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    id="email-all-cancel"
                                    onClick={() => setIsEmailAllModalOpen(false)}
                                    disabled={sendingAllEmails}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    id="email-all-confirm"
                                    onClick={handleEmailAll}
                                    disabled={sendingAllEmails}
                                    className="flex-[1.3]"
                                    isLoading={sendingAllEmails}
                                >
                                    {!sendingAllEmails && <HiOutlineEnvelope className="w-4 h-4 flex-shrink-0" />}
                                    <span>{sendingAllEmails ? 'Sending\u2026' : 'Send Invoices'}</span>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
            )}
            </AnimatePresence>,
            document.body
            )}

        </motion.div>
    );
};

export default MessBillInvoice;
