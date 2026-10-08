import { useMemo, useCallback, memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { Send } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    HiOutlineArrowDownTray,
    HiOutlineEnvelope,
    HiOutlineShieldCheck,
    HiOutlineChevronDown,
    HiOutlineUser,
    HiOutlineUsers,
    HiOutlineXMark,
} from 'react-icons/hi2';
import { Spinner, Button } from '@/shared/components/ui';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { fmt } from '@/core/utils/helpers/currency.helper';
import { buildMealRateFormula } from '@/core/utils/helpers/billing.helper';
import invoiceService from '../../services/invoice.service';

/* ══════════════════════════════════════════════════════════════
   InvoicePreview — PDF-exact invoice preview component

   Renders the same layout as pdf.service.js:
   Header (issuer + BILLED TO + labelled period/issued-on in IST) →
   Stat Cards → LEDGER (charges → subtotal → less market → rounding) →
   Total Box (neutral) + status chip → PAYMENT/REFUND DETAILS → Footer

   All colors map to the PDF's palette via Tailwind design tokens.
   ══════════════════════════════════════════════════════════════ */

/* ── Status chip — glyph + label + token pair (never colour alone).
      Mirrors pdf.service.js CHIPS; colour never carries meaning alone. ── */
const CHIPS = {
    pending:  { glyph: '!',      label: 'DUE',        cls: 'bg-warning-bg text-warning-text border-warning-border' },
    partial:  { glyph: '\u2026', label: 'PARTIAL',    cls: 'bg-warning-bg text-warning-text border-warning-border' },
    success:  { glyph: '\u2713', label: 'PAID',       cls: 'bg-success-bg text-success-text border-success-border' },
    refund:   { glyph: '\u21A9', label: 'REFUND DUE', cls: 'bg-refund-bg text-refund-text border-refund-border' },
    refunded: { glyph: '\u21BA', label: 'REFUNDED',   cls: 'bg-refund-bg text-refund-text border-refund-border' },
};

/* ── Money display: 2 decimals, true minus sign (mirrors fmt2+money in PDF) ── */
const money = (n) => {
    const v = Math.round((Number(n) + Number.EPSILON) * 100) / 100;
    return `${v < 0 ? '\u2212' : ''}\u20B9${fmt(Math.abs(v), 2, 2)}`;
};
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* ── IST display helpers — timestamps are UTC; display pinned to Asia/Kolkata
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

/* ── Row helpers (PDF-identical line items) ── */
const DataRow = memo(({ label, value, subLabel, accent = false }) => (
    <div className="flex items-start justify-between py-2 border-b border-border/60 last:border-0 gap-3">
        <div className="min-w-0">
            <p className={`text-sm ${accent ? 'text-primary font-semibold' : 'text-foreground'}`}>{label}</p>
            {subLabel && <div className="text-[11px] text-muted-foreground mt-0.5">{subLabel}</div>}
        </div>
        <span className={`text-sm font-bold tabular-nums whitespace-nowrap ${accent ? 'text-primary' : 'text-foreground'}`}>
            {value}
        </span>
    </div>
));
DataRow.displayName = 'DataRow';

/* ── Section divider (PDF-identical) ── */
const SectionLabel = memo(({ label }) => (
    <div className="pt-3 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground border-b border-border pb-1.5">
            {label}
        </p>
    </div>
));
SectionLabel.displayName = 'SectionLabel';

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

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
const InvoicePreview = ({
    invoice,
    user,
    paymentRecord: externalPaymentRecord,
    onPayNow,
    isPaying,
    userId,
    isAdmin = false,
}) => {
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingAllEmails, setSendingAllEmails] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pendingEmailAction, setPendingEmailAction] = useState(null);
    const [isEmailMenuOpen, setIsEmailMenuOpen] = useState(false);
    const [emailMenuPos, setEmailMenuPos] = useState({ top: 0, left: 0 });

    const emailContainerRef = useRef(null);
    const emailMenuRef = useRef(null);
    const emailMenuItemRefs = useRef([]);
    const isMobile = useMediaQuery('(max-width: 639px)');
    const shouldReduceMotion = useReducedMotion();

    /* ── Derived values (mirrors pdf.service.js exactly) ── */
    const meta = useMemo(() => {
        const monthName = invoice?.monthName || `Month ${invoice?.month}/${invoice?.year}`;
        const issuedAt = istFull(new Date());   // IST, not browser-local

        const invoiceNo = `UM-${invoice?.year}${String(invoice?.month).padStart(2, '0')}-${
            String(invoice?._id || invoice?.user || 'GEN').slice(-6).toUpperCase()
        }`;

        return { monthName, issuedAt, invoiceNo };
    }, [invoice?.monthName, invoice?.month, invoice?.year, invoice?._id, invoice?.user]);

    const amounts = useMemo(() => {
        const finalPayable = invoice?.totalPayable ?? 0;
        const isRefund = finalPayable < 0;
        const displayAmt = Math.abs(finalPayable);
        const paidAmount = invoice?.paidAmount ?? 0;
        const totalPayable = invoice?.totalPayable ?? 0;
        const remainingAmount = invoice?.remainingAmount ?? Math.max(0, totalPayable - paidAmount);

        return { finalPayable, isRefund, displayAmt, paidAmount, totalPayable, remainingAmount };
    }, [invoice?.totalPayable, invoice?.paidAmount, invoice?.remainingAmount]);

    const status = useMemo(() => {
        const s = invoice?.status ?? 'unpaid';
        const isPaid = s === 'paid';
        const isPartiallyPaid = s === 'partially_paid';
        const isRefund = amounts.isRefund;
        // refundSettled comes from the backend's refund payout record —
        // totalPayable < 0 stays negative AFTER the money is returned.
        const refundSettled = !!invoice?.refundSettled;

        const label = isPaid ? 'Paid' : isPartiallyPaid ? 'Partial'
            : isRefund ? (refundSettled ? 'Refunded' : 'Refund Due') : 'Due';
        const settled = isPaid || isRefund;

        // Chip key — same precedence as pdf.service.js: settled money >
        // partial > refund sign > unpaid.
        const chipKey = isPaid ? 'success'
            : isPartiallyPaid ? 'partial'
                : isRefund ? (refundSettled ? 'refunded' : 'refund')
                    : 'pending';

        return { isPaid, isPartiallyPaid, isRefund, refundSettled, label, settled, chipKey };
    }, [invoice?.status, invoice?.refundSettled, amounts.isRefund]);

    /* ── Mess-wide stats (from backend enrichment) ── */
    const grandStats = useMemo(() => ({
        marketTotal: invoice?._messGrandTotalMarket ?? 0,
        totalMeals: invoice?._messGrandTotalMeal ?? 0,
        totalGuest: invoice?._messGrandTotalGuest ?? 0,
    }), [invoice?._messGrandTotalMarket, invoice?._messGrandTotalMeal, invoice?._messGrandTotalGuest]);

    /* ── User-level values ── */
    const userValues = useMemo(() => ({
        mealCount: invoice?.mealCount ?? 0,
        marketSpent: invoice?.marketAmountSpent ?? 0,
        waterBill: invoice?.fixedCosts?.waterBill ?? 0,
        cookingCharge: invoice?.fixedCosts?.cookingCharge ?? 0,
        platformFee: invoice?.fixedCosts?.platformFee ?? 0,
        costOfMeals: invoice?.messCost ?? 0,
        adjustedMealCharge: invoice?.mealRate ?? 0,
        guestMealCount: invoice?.guestMealCount ?? 0,
        guestMealRevenue: invoice?.guestMealRevenue ?? 0,
        chargePerGuestMeal: user?.chargePerGuestMeal ?? 60,
    }), [invoice, user?.chargePerGuestMeal]);

    /* ── Ledger — displayed rows must reconcile to the displayed total:
          subtotal (2dp rows) − market + rounding = totalPayable
          (mirrors pdf.service.js ledger math) ── */
    const ledger = useMemo(() => {
        const u = userValues;
        const dispSum = r2(r2(u.costOfMeals) + r2(u.waterBill) + r2(u.cookingCharge)
            + (u.guestMealCount > 0 ? r2(u.guestMealRevenue) : 0) + r2(u.platformFee));
        const market = r2(u.marketSpent);
        const rounding = r2(amounts.finalPayable - (dispSum - market));
        return { dispSum, market, rounding };
    }, [userValues, amounts.finalPayable]);

    /* ── Meal-rate breakdown formula (mirrors dashboard sub-label) ── */
    const mealRateFormula = useMemo(() => {
        if ((invoice?.mealRate ?? 0) <= 0) return undefined;

        const guestRate = userValues.guestMealCount > 0 && userValues.guestMealRevenue > 0
            ? Number((userValues.guestMealRevenue / userValues.guestMealCount).toFixed(2))
            : userValues.chargePerGuestMeal;

        return buildMealRateFormula({
            totalMarket: grandStats.marketTotal,
            totalGuest: grandStats.totalGuest,
            totalOwnMeals: grandStats.totalMeals - grandStats.totalGuest,
            guestMealRate: guestRate,
        });
    }, [
        invoice?.mealRate,
        grandStats,
        userValues.guestMealCount,
        userValues.guestMealRevenue,
        userValues.chargePerGuestMeal,
    ]);

    /* Meals row sub-lines: qty × rate + the mess-wide formula ── */
    const mealsSubLabel = useMemo(() => (
        <>
            <span className="block tabular-nums">
                {fmt(userValues.mealCount)} meals {'\u00D7'} {'\u20B9'}{fmt(userValues.adjustedMealCharge, 2, 2)}
            </span>
            {mealRateFormula && (
                <span className="block font-medium text-foreground/70 tabular-nums">
                    {mealRateFormula}
                </span>
            )}
        </>
    ), [mealRateFormula, userValues.mealCount, userValues.adjustedMealCharge]);

    /* ── Payment record (merge backend + external fallback) ── */
    const paymentData = useMemo(() => ({
        paymentMethod: invoice?._paymentMethod || externalPaymentRecord?.paymentMethod,
        transactionId: invoice?._transactionId || externalPaymentRecord?.transactionId,
        utr: invoice?._utr || externalPaymentRecord?.utr,
        paymentDate: invoice?._paymentDate || externalPaymentRecord?.paymentDate,
        payeeVpa: invoice?._payeeVpa || null,
        recordedByName: invoice?._recordedByName || null,
        verifiedByName: invoice?._verifiedByName || null,
        status: externalPaymentRecord?.status || invoice?.status,
    }), [invoice, externalPaymentRecord]);

    /* ── Core handlers ── */
    const handleDownloadPDF = useCallback(async () => {
        setIsDownloading(true);
        try {
            await invoiceService.downloadInvoice(invoice?.year, invoice?.month, userId);
            toast.success('Invoice downloaded');
        } catch {
            toast.error('Failed to download invoice');
        } finally {
            setIsDownloading(false);
        }
    }, [invoice?.year, invoice?.month, userId]);

    const handleSendEmail = useCallback(async () => {
        setSendingEmail(true);
        try {
            await invoiceService.sendInvoiceEmail(invoice?.year, invoice?.month, userId);
            toast.success('Invoice sent to your email!');
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Failed to send invoice email');
        } finally {
            setSendingEmail(false);
        }
    }, [invoice?.year, invoice?.month, userId]);

    const handleEmailAll = useCallback(async () => {
        setSendingAllEmails(true);
        try {
            const res = await invoiceService.emailAllInvoices({ month: invoice?.month, year: invoice?.year });
            const { sent, failed } = res?.data ?? {};
            if (failed > 0) {
                toast(
                    `Emailed ${sent} member${sent !== 1 ? 's' : ''}, ${failed} failed.`,
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
    }, [invoice?.month, invoice?.year]);

    const handlePayNow = useCallback(() => {
        if (typeof onPayNow === 'function') {
            onPayNow(meta.monthName);
        }
    }, [onPayNow, meta.monthName]);

    /* ── Email menu handlers (two-step flow) ── */
    const handleSelectEmailAction = useCallback((action) => {
        setPendingEmailAction(action);
        setIsEmailMenuOpen(false);
    }, []);

    const handleConfirmSendEmail = useCallback(async () => {
        if (!pendingEmailAction) return;
        if (pendingEmailAction === 'me') {
            await handleSendEmail();
        } else if (pendingEmailAction === 'all') {
            await handleEmailAll();
        }
        setPendingEmailAction(null);
    }, [pendingEmailAction, handleSendEmail, handleEmailAll]);

    const handleResetEmailAction = useCallback(() => {
        setPendingEmailAction(null);
    }, []);

    const toggleEmailMenu = useCallback(() => {
        setIsEmailMenuOpen((prev) => !prev);
    }, []);

    /* ── Scroll lock: prevent wheel/touchmove on Modal's scroll container ── */
    useEffect(() => {
        if (!isEmailMenuOpen) return;

        const handleWheel = (e) => {
            const scrollContainer = e.target.closest('[role="dialog"] .overflow-y-auto');
            if (scrollContainer) e.preventDefault();
        };
        const handleTouchMove = (e) => {
            const scrollContainer = e.target.closest('[role="dialog"] .overflow-y-auto');
            if (scrollContainer) e.preventDefault();
        };

        document.addEventListener('wheel', handleWheel, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        return () => {
            document.removeEventListener('wheel', handleWheel);
            document.removeEventListener('touchmove', handleTouchMove);
        };
    }, [isEmailMenuOpen]);

    /* ── Click-outside detection ── */
    useEffect(() => {
        if (!isEmailMenuOpen) return;

        const handleClickOutside = (e) => {
            if (
                emailMenuRef.current && !emailMenuRef.current.contains(e.target) &&
                emailContainerRef.current && !emailContainerRef.current.contains(e.target)
            ) {
                setIsEmailMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEmailMenuOpen]);

    /* ── Escape key ── */
    useEffect(() => {
        if (!isEmailMenuOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsEmailMenuOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isEmailMenuOpen]);

    /* ── Keyboard navigation for menu items (ArrowUp/Down, Home/End) ── */
    const handleEmailMenuKeyDown = useCallback((e) => {
        if (!isEmailMenuOpen) return;
        const items = emailMenuItemRefs.current.filter(Boolean);
        const currentIndex = items.indexOf(document.activeElement);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                items[(currentIndex + 1) % items.length]?.focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                items[(currentIndex - 1 + items.length) % items.length]?.focus();
                break;
            case 'Home':
                e.preventDefault();
                items[0]?.focus();
                break;
            case 'End':
                e.preventDefault();
                items[items.length - 1]?.focus();
                break;
        }
    }, [isEmailMenuOpen]);

    /* ── Viewport-aware menu positioning ── */
    useEffect(() => {
        if (!isEmailMenuOpen || !emailContainerRef.current) return;

        const rect = emailContainerRef.current.getBoundingClientRect();
        const MENU_W = 208;
        const MENU_H = 110;
        const GAP = 4;
        const MARGIN = 12;

        let top = rect.bottom + window.scrollY + GAP;
        let left = rect.right - MENU_W;

        if (rect.bottom + MENU_H + GAP > window.innerHeight) {
            top = rect.top + window.scrollY - MENU_H - GAP;
        }
        if (left < MARGIN) left = MARGIN;
        if (left + MENU_W > window.innerWidth - MARGIN) {
            left = window.innerWidth - MENU_W - MARGIN;
        }

        setEmailMenuPos({ top, left });
    }, [isEmailMenuOpen, isMobile]);

    /* ── Focus first menu item when opened ── */
    useEffect(() => {
        if (!isEmailMenuOpen) return;
        const timer = setTimeout(() => {
            emailMenuItemRefs.current[0]?.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, [isEmailMenuOpen]);

    /* ── Status chip + neutral total-box styling (mirrors pdf.service.js:
          status colour lives ONLY in the chip; the box is neutral) ── */
    const chip = CHIPS[status.chipKey];

    /* ── PAYMENT DETAILS rows — real, annotated data only (never
          user-supplied text), exactly the PDF's row set ── */
    const paymentRows = useMemo(() => {
        if (!paymentData.paymentMethod) return [];
        const rows = [
            { label: 'Paid at', value: (paymentData.paymentDate && istFull(new Date(paymentData.paymentDate))) || '\u2014' },
            { label: 'Method', value: METHOD_LABELS[paymentData.paymentMethod] || paymentData.paymentMethod },
        ];
        const ref = paymentData.utr || paymentData.transactionId;
        if (ref) rows.push({ label: paymentData.utr ? 'UTR' : 'Transaction ID', value: ref, mono: true });
        if (paymentData.payeeVpa) rows.push({ label: 'Payee', value: maskVpa(paymentData.payeeVpa) });
        rows.push(paymentData.verifiedByName
            ? { label: 'Verified by', value: paymentData.verifiedByName }
            : { label: 'Recorded by', value: paymentData.recordedByName || 'admin' });
        return rows;
    }, [paymentData]);

    /* ── REFUND DETAILS rows — shown when the refund payout is recorded ── */
    const refundRows = useMemo(() => {
        if (!status.refundSettled) return [];
        return [
            { label: 'Refund amount', value: money(invoice?._refundAmount ?? amounts.displayAmt) },
            { label: 'Refunded on', value: (invoice?._refundAt && istFull(new Date(invoice._refundAt))) || '\u2014' },
            { label: 'Reference', value: invoice?._refundReference || '\u2014', mono: true },
        ];
    }, [status.refundSettled, invoice?._refundAmount, invoice?._refundAt, invoice?._refundReference, amounts.displayAmt]);

    const isEmailBusy = sendingEmail || sendingAllEmails;

    if (!invoice) return null;

    return (
        <div className="invoice-print mx-auto w-full bg-background dark:bg-[#151820] rounded-xl border border-border/50 overflow-hidden shadow-sm">

            {/* ═══════════════════════════════════════════════════
               HEADER — Issuer + BILLED TO | Invoice meta (IST)
               ═══════════════════════════════════════════════════ */}
            <div className="p-2.5 sm:p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center -mt-px gap-[var(--um-space-3)]">
                            <img
                                src="/assets/icons/resize_logo.png"
                                alt="United Mess"
                                style={{ aspectRatio: '1 / 1' }}
                                className="block w-[1.05em] h-[1.05em] object-contain flex-shrink-0 rounded-[var(--radius-md)]"
                            />
                            <p className="text-[length:var(--um-fs-brand)] font-bold leading-tight tracking-tight text-foreground">
                                United
                                <span className="text-primary"> Mess</span>
                            </p>
                        </div>
                        <div className="mt-1 space-y-0.5">
                            <p className="text-[length:var(--um-fs-meta)] text-muted-foreground">
                                Mess Management Platform
                            </p>
                        </div>
                        <div className="mt-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                BILLED TO
                            </p>
                            <p className="text-[13px] font-semibold text-foreground mt-0.5">
                                {user?.name || '\u2014'}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                {user?.email || ''}
                            </p>
                        </div>
                    </div>

                    <div className="text-right flex-shrink-0 min-w-0 max-w-[60%] space-y-1">
                        <p className="text-[length:var(--um-fs-caption)] font-semibold uppercase tracking-widest text-muted-foreground/70">
                            Invoice
                        </p>
                        <p className="text-[length:var(--um-fs-meta)] text-primary font-semibold font-mono">
                            {meta.invoiceNo}
                        </p>
                        <div className="flex items-baseline justify-end gap-3 pt-1">
                            <span className="text-[11px] text-muted-foreground shrink-0">Billing period</span>
                            <span className="text-[13px] font-semibold text-foreground text-right">
                                {meta.monthName}
                            </span>
                        </div>
                        <div className="flex items-baseline justify-end gap-3">
                            <span className="text-[11px] text-muted-foreground shrink-0">Issued on</span>
                            <span className="text-[13px] text-foreground text-right">
                                {meta.issuedAt || '\u2014'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-3 sm:px-5">
                <div className="h-[2px] bg-primary" />
            </div>

            {/* ═══════════════════════════════════════════════════
               STAT CARDS
               ═══════════════════════════════════════════════════ */}
            <div className="px-3 sm:px-5 pt-3">
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-2.5 flex flex-col">
                        <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
                            Market Total (All)
                        </p>
                        <p className="text-sm sm:text-base font-bold tabular-nums text-foreground mt-auto pt-1">
                            {money(grandStats.marketTotal)}
                        </p>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-2.5 flex flex-col">
                        <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
                            Total Meals (All)
                        </p>
                        {grandStats.totalGuest > 0 && (
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 tabular-nums mt-0.5">
                                {fmt(grandStats.totalMeals - grandStats.totalGuest)} + {fmt(grandStats.totalGuest)} Guest
                            </p>
                        )}
                        <p className="text-sm sm:text-base font-bold tabular-nums text-foreground mt-auto pt-1">
                            {fmt(grandStats.totalMeals)}
                        </p>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-2.5 flex flex-col">
                        <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
                            {amounts.isRefund
                                ? (status.refundSettled ? 'Refunded' : 'Refund Due')
                                : 'Your Payable'}
                        </p>
                        <p className="text-sm sm:text-base font-bold tabular-nums text-foreground mt-auto pt-1">
                            {money(amounts.finalPayable)}
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
               LEDGER — every line reconciles to totalPayable
               (invoice.service.js:236: mess + cooking + water +
                platform + guest − market)
               ═══════════════════════════════════════════════════ */}
            <div className="px-3 sm:px-5 pt-1 pb-1">
                <SectionLabel label="Ledger" />
                <DataRow label="Meals" value={money(userValues.costOfMeals)} subLabel={mealsSubLabel} />
                <DataRow label="Water Bill" value={money(userValues.waterBill)} />
                <DataRow label="Cooking Charge" value={money(userValues.cookingCharge)} />
                {userValues.guestMealCount > 0 && (
                    <DataRow
                        label="Guest Meals"
                        value={money(userValues.guestMealRevenue)}
                        subLabel={`${userValues.guestMealCount} meals \u00D7 \u20B9${fmt(userValues.guestMealRevenue / userValues.guestMealCount, 2, 2)}`}
                    />
                )}
                {userValues.platformFee !== 0 && (
                    <DataRow label="Platform Fee" value={money(userValues.platformFee)} />
                )}

                <DataRow label="Subtotal" value={money(ledger.dispSum)} accent />
                <DataRow
                    label="Less: Market spend you paid"
                    value={money(-ledger.market)}
                    subLabel={ledger.market > 0
                        ? 'Credit \u2014 spend you settled directly'
                        : 'No direct market spend recorded'}
                />
                <DataRow label="Rounding off" value={money(ledger.rounding)} />
            </div>

            {/* ═══════════════════════════════════════════════════
               TOTAL BOX — neutral container; status colour lives
               only in the chip. Total, Paid and Balance due here once.
               ═══════════════════════════════════════════════════ */}
            <div className="px-3 sm:px-5 pt-2 pb-3">
                <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-muted/30 border-border">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">
                            {amounts.isRefund ? 'Total (Credit)' : 'Total Payable'}
                        </p>
                        <p className="text-xl sm:text-[22px] font-extrabold tabular-nums leading-none text-foreground">
                            {money(amounts.finalPayable)}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${chip.cls}`}
                        >
                            <span aria-hidden="true">{chip.glyph}</span>
                            <span>{chip.label}</span>
                        </span>
                        <div className="w-full min-w-[150px] space-y-1">
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-[11px] text-muted-foreground">Paid</span>
                                <span className="text-[11px] font-semibold text-foreground tabular-nums">
                                    {money(amounts.paidAmount)}
                                </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-[11px] text-muted-foreground">Balance due</span>
                                <span className="text-[11px] font-semibold text-foreground tabular-nums">
                                    {amounts.isRefund
                                        ? '\u2014'
                                        : money(Math.max(0, amounts.finalPayable - amounts.paidAmount))}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
               PAYMENT / REFUND DETAILS — annotated Payment-record
               data only (never user-supplied text)
               ═══════════════════════════════════════════════════ */}
            {paymentRows.length > 0 && (
                <div className="px-3 sm:px-5 pb-3">
                    <div className="rounded-xl border border-border bg-muted/30 px-3 sm:px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground border-b border-border/60 pb-1.5">
                            Payment Details
                        </p>
                        <div className="pt-1.5 space-y-0.5">
                            {paymentRows.map((r) => (
                                <KeyRow key={r.label} label={r.label} value={r.value} mono={r.mono} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {refundRows.length > 0 && (
                <div className="px-3 sm:px-5 pb-3">
                    <div className="rounded-xl border border-border bg-muted/30 px-3 sm:px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground border-b border-border/60 pb-1.5">
                            Refund Details
                        </p>
                        <div className="pt-1.5 space-y-0.5">
                            {refundRows.map((r) => (
                                <KeyRow key={r.label} label={r.label} value={r.value} mono={r.mono} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
               ACTION BUTTONS — Pay Now + Download + Email
               ═══════════════════════════════════════════════════ */}
            <div className="no-print px-3 sm:px-5 pb-3 space-y-2">
                {!status.isPaid && !amounts.isRefund && onPayNow && (
                    <Button
                        type="button"
                        variant={status.isPartiallyPaid ? 'warning' : 'primary'}
                        fullWidth
                        disabled={isPaying}
                        onClick={handlePayNow}
                        isLoading={isPaying}
                    >
                        {!isPaying && <HiOutlineShieldCheck className="w-4 h-4 opacity-80" />}
                        <span>{isPaying ? 'Processing\u2026' : status.isPartiallyPaid ? 'Pay Remaining Balance' : 'Pay Bill'}</span>
                    </Button>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" disabled={isDownloading} onClick={handleDownloadPDF}>
                        {isDownloading ? <Spinner size="sm" color="current" /> : <HiOutlineArrowDownTray className="w-4 h-4 flex-shrink-0" />}
                        <span>Download</span>
                    </Button>

                    {isAdmin ? (
                        <div ref={emailContainerRef} className="flex min-w-0">
                            <Button
                                type="button"
                                variant={pendingEmailAction ? 'primary' : 'secondary'}
                                disabled={isEmailBusy}
                                onClick={pendingEmailAction ? handleConfirmSendEmail : toggleEmailMenu}
                                className="rounded-r-none flex-1 min-w-0"
                            >
                                {isEmailBusy ? (
                                    <Spinner size="sm" color="current" />
                                ) : pendingEmailAction ? (
                                    <Send className="w-4 h-4 flex-shrink-0" />
                                ) : (
                                    <HiOutlineEnvelope className="w-4 h-4 flex-shrink-0" />
                                )}
                                <span className="truncate">
                                    {isEmailBusy
                                        ? 'Sending\u2026'
                                        : pendingEmailAction === 'me'
                                            ? 'Send to me'
                                            : pendingEmailAction === 'all'
                                                ? 'Send to all'
                                                : 'Email'
                                    }
                                </span>
                            </Button>

                            {pendingEmailAction ? (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled={isEmailBusy}
                                    onClick={handleResetEmailAction}
                                    className="rounded-l-none px-2 flex-shrink-0"
                                >
                                    <HiOutlineXMark className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={isEmailBusy}
                                    onClick={toggleEmailMenu}
                                    className="rounded-l-none px-2 border-l border-border/50 flex-shrink-0"
                                >
                                    <HiOutlineChevronDown className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Button type="button" variant="secondary" disabled={sendingEmail} onClick={handleSendEmail}>
                            {sendingEmail ? <Spinner size="sm" color="current" /> : <HiOutlineEnvelope className="w-4 h-4 flex-shrink-0" />}
                            <span>Email</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
               FOOTER
               ═══════════════════════════════════════════════════ */}
            <div className="px-3 sm:px-5 pb-4">
                <div className="border-t border-border pt-3 text-center space-y-1">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        System-generated invoice for {meta.monthName}. For disputes, contact your mess admin.
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium">
                        United Mess {'\u00B7'} {meta.invoiceNo} {'\u00B7'} Generated {meta.issuedAt}
                    </p>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
               PORTAL EMAIL MENU — Dropdown-matching fintech-grade
               - Framer Motion spring animations (matches shared Dropdown)
               - Keyboard navigation (ArrowUp/Down, Home/End, Enter)
               - Focus management (auto-focus first item, roving tabindex)
               - Portal rendering (escapes Modal overflow)
               - Modal-aware scroll lock (prevents wheel/touchmove)
               ═══════════════════════════════════════════════════ */}
            {isAdmin && createPortal(
                <>
                    <AnimatePresence>
                        {isEmailMenuOpen && (
                            <motion.div
                                ref={emailMenuRef}
                                role="menu"
                                aria-label="Email action"
                                initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -4, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={shouldReduceMotion ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: -8 }}
                                transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
                                onKeyDown={handleEmailMenuKeyDown}
                                className="fixed z-[9999] w-52 py-1 surface-overlay border border-border rounded-lg shadow-xl"
                                style={{ top: emailMenuPos.top, left: emailMenuPos.left }}
                            >
                                <div className="px-1 py-0.5">
                                    <button
                                        ref={(el) => { emailMenuItemRefs.current[0] = el; }}
                                        role="menuitem"
                                        tabIndex={0}
                                        disabled={isEmailBusy}
                                        onClick={() => handleSelectEmailAction('me')}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-left text-sm text-foreground hover:bg-muted focus:bg-muted rounded-md transition-colors duration-150 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        <HiOutlineUser className="w-4 h-4 shrink-0 text-muted-foreground" />
                                        <span>Send to me</span>
                                    </button>

                                    <button
                                        ref={(el) => { emailMenuItemRefs.current[1] = el; }}
                                        role="menuitem"
                                        tabIndex={-1}
                                        disabled={isEmailBusy}
                                        onClick={() => handleSelectEmailAction('all')}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-left text-sm text-foreground hover:bg-muted focus:bg-muted rounded-md transition-colors duration-150 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        <HiOutlineUsers className="w-4 h-4 shrink-0 text-muted-foreground" />
                                        <span>Send to all members</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>,
                document.body
            )}
        </div>
    );
};

export default memo(InvoicePreview);
