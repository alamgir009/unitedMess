import { useMemo, useCallback, memo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    HiOutlineCheckCircle,
    HiOutlineArrowDownTray,
    HiOutlineEnvelope,
    HiOutlineShieldCheck,
    HiOutlineArrowPath,
} from 'react-icons/hi2';
import { Spinner } from '@/shared/components/ui';
import { fmt } from '@/core/utils/helpers/currency.helper';
import invoiceService from '../../services/invoice.service';

/* ══════════════════════════════════════════════════════════════
   InvoicePreview — PDF-exact invoice preview component

   Renders the same layout as pdf.service.js:
   Header → Stat Cards → Usage → Charges → Calculations →
   Previous Balance (conditional) → Total Box → Payment Block → Footer

   All colors map to the PDF's palette via Tailwind design tokens.
   ══════════════════════════════════════════════════════════════ */

/* ── Row helpers (PDF-identical line items) ── */
const DataRow = memo(({ label, value, subLabel, accent = false }) => (
    <div className="flex items-start justify-between py-2 border-b border-border/60 last:border-0 gap-3">
        <div className="min-w-0">
            <p className={`text-sm ${accent ? 'text-primary font-semibold' : 'text-foreground'}`}>{label}</p>
            {subLabel && <p className="text-[11px] text-muted-foreground mt-0.5">{subLabel}</p>}
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
}) => {
    const [sendingEmail, setSendingEmail] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    /* ── Derived values (mirrors pdf.service.js exactly) ── */
    const meta = useMemo(() => {
        const monthName = invoice?.monthName || `Month ${invoice?.month}/${invoice?.year}`;
        const displayDate = new Date().toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
        });

        const invoiceNo = `UM-${invoice?.year}${String(invoice?.month).padStart(2, '0')}-${
            String(invoice?._id || invoice?.user || 'GEN').slice(-6).toUpperCase()
        }`;

        return { monthName, displayDate, invoiceNo };
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

        const label = isPaid ? 'Paid' : isPartiallyPaid ? 'Partial' : isRefund ? 'Refund Due' : 'Due';
        const settled = isPaid || isRefund;

        return { isPaid, isPartiallyPaid, isRefund, label, settled };
    }, [invoice?.status, amounts.isRefund]);

    /* ── Mess-wide stats (from backend enrichment) ── */
    const grandStats = useMemo(() => ({
        marketTotal: invoice?._messGrandTotalMarket ?? 0,
        totalMeals: invoice?._messGrandTotalMeal ?? 0,
    }), [invoice?._messGrandTotalMarket, invoice?._messGrandTotalMeal]);

    /* ── User-level values ── */
    const userValues = useMemo(() => ({
        mealCount: invoice?.mealCount ?? 0,
        marketSpent: invoice?.marketAmountSpent ?? 0,
        waterBill: invoice?.fixedCosts?.waterBill ?? 0,
        cookingCharge: invoice?.fixedCosts?.cookingCharge ?? 0,
        gasBillCharge: invoice?.fixedCosts?.gasBillCharge ?? 0,
        platformFee: invoice?.fixedCosts?.platformFee ?? 0,
        costOfMeals: invoice?.messCost ?? 0,
        adjustedMealCharge: invoice?.mealRate ?? 0,
        guestMealCount: invoice?.guestMealCount ?? 0,
        guestMealRevenue: invoice?.guestMealRevenue ?? 0,
        chargePerGuestMeal: user?.chargePerGuestMeal ?? 60,
        prevBalance: invoice?.previousBalance ?? 0,
    }), [invoice, user?.chargePerGuestMeal]);

    /* ── Payment record (merge backend + external fallback) ── */
    const paymentData = useMemo(() => ({
        paymentMethod: invoice?._paymentMethod || externalPaymentRecord?.paymentMethod,
        transactionId: invoice?._transactionId || externalPaymentRecord?.transactionId,
        utr: invoice?._utr || externalPaymentRecord?.utr,
        paymentDate: invoice?._paymentDate || externalPaymentRecord?.paymentDate,
        status: externalPaymentRecord?.status || invoice?.status,
    }), [invoice, externalPaymentRecord]);

    /* ── Handlers ── */
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

    const handlePayNow = useCallback(() => {
        if (typeof onPayNow === 'function') {
            onPayNow(meta.monthName);
        }
    }, [onPayNow, meta.monthName]);

    /* ── Status color mapping (mirrors pdf.service.js palette) ── */
    const totalBoxStyle = useMemo(() => {
        if (status.isPaid || amounts.isRefund) {
            return 'bg-success-bg border-success-border';
        }
        if (status.isPartiallyPaid) {
            return 'bg-warning-bg border-warning-border';
        }
        return 'bg-primary/5 border-primary/20';
    }, [status.isPaid, status.isPartiallyPaid, amounts.isRefund]);

    const amountTextStyle = useMemo(() => {
        if (amounts.isRefund) return 'text-success-text';
        if (status.isPaid) return 'text-success-text';
        return 'text-primary';
    }, [amounts.isRefund, status.isPaid]);

    const badgeStyle = useMemo(() => {
        if (status.isPaid || amounts.isRefund) {
            return 'bg-success-bg text-success-text border-success-border';
        }
        if (status.isPartiallyPaid) {
            return 'bg-warning-bg text-warning-text border-warning-border';
        }
        return 'bg-primary/10 text-primary border-primary/20';
    }, [status.isPaid, status.isPartiallyPaid, amounts.isRefund]);

    if (!invoice) return null;

    return (
        <div className="mx-auto w-full bg-background dark:bg-[#151820] rounded-xl border border-border/50 overflow-hidden shadow-sm">

            {/* ═══════════════════════════════════════════════════
               HEADER — Logo + Brand + Invoice Meta
               Matches pdf.service.js HEADER section exactly
               ═══════════════════════════════════════════════════ */}
            <div className="p-2.5 sm:p-4">
                <div className="flex items-start justify-between gap-4">
                    {/* Left: Logo + Brand + User */}
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
                            <p className="text-[length:var(--um-fs-meta)] text-foreground/80 font-medium">
                                {user?.name || '\u2014'}
                            </p>
                            <p className="text-[length:var(--um-fs-meta)] text-foreground/80">
                                {user?.email || ''}
                            </p>
                        </div>
                    </div>

                    {/* Right: Invoice meta (matches PDF right-aligned block) */}
                    <div className="text-right flex-shrink-0 space-y-[var(--um-space-1)]">
                        <p className="text-[length:var(--um-fs-caption)] font-semibold uppercase tracking-widest text-muted-foreground/70">
                            Invoice
                        </p>
                        <p className="text-[length:var(--um-fs-meta)] text-primary font-semibold font-mono">
                            {meta.invoiceNo}
                        </p>
                        <p className="text-[length:var(--um-fs-meta)] text-foreground/80 font-semibold">
                            {meta.monthName}
                        </p>
                        <p className="text-[length:var(--um-fs-meta)] text-foreground/80">
                            {meta.displayDate}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Indigo divider (PDF: hRule with C.indigo, thick=2) ── */}
            <div className="px-3 sm:px-5">
                <div className="h-[2px] bg-primary" />
            </div>

            {/* ═══════════════════════════════════════════════════
               STAT CARDS — 3 horizontal cards
               Matches pdf.service.js STAT CARDS section exactly
               ═══════════════════════════════════════════════════ */}
            <div className="px-3 sm:px-5 pt-3">
                <div className="grid grid-cols-3 gap-2">
                    {/* Card 1: Market Total (All) */}
                    <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-2.5 flex flex-col">
                        <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
                            Market Total (All)
                        </p>
                        <p className="text-sm sm:text-base font-bold tabular-nums text-foreground mt-auto pt-1">
                            {'\u20B9'}{fmt(grandStats.marketTotal)}
                        </p>
                    </div>

                    {/* Card 2: Total Meals (All) */}
                    <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-2.5 flex flex-col">
                        <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
                            Total Meals (All)
                        </p>
                        <p className="text-sm sm:text-base font-bold tabular-nums text-foreground mt-auto pt-1">
                            {fmt(grandStats.totalMeals)}
                        </p>
                    </div>

                    {/* Card 3: Your Payable (indigo accent) */}
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 sm:p-2.5 flex flex-col">
                        <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-primary/70 leading-tight">
                            {amounts.isRefund ? 'Refund Due' : 'Your Payable'}
                        </p>
                        <p className="text-sm sm:text-base font-bold tabular-nums text-primary mt-auto pt-1">
                            {'\u20B9'}{fmt(amounts.displayAmt)}
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
               SECTIONS — Usage, Charges, Calculations
               Matches pdf.service.js section layout exactly
               ═══════════════════════════════════════════════════ */}
            <div className="px-3 sm:px-5 pt-1 pb-1">

                {/* ── YOUR USAGE ── */}
                <SectionLabel label="Your Usage" />
                <DataRow
                    label="Your Meals"
                    value={`${fmt(userValues.mealCount)} meals`}
                />
                <DataRow
                    label="Your Market Spend"
                    value={`\u20B9${fmt(userValues.marketSpent)}`}
                    subLabel="What you spent"
                />

                {/* ── MONTHLY CHARGES ── */}
                <SectionLabel label="Monthly Charges" />
                <DataRow
                    label="Water Bill"
                    value={`\u20B9${fmt(userValues.waterBill)}`}
                />
                <DataRow
                    label="Cooking Charge"
                    value={`\u20B9${fmt(userValues.cookingCharge)}`}
                />
                {userValues.guestMealCount > 0 && (
                    <DataRow
                        label="Guest Meals"
                        value={`\u20B9${fmt(userValues.guestMealRevenue)}`}
                        subLabel={`${userValues.guestMealCount} meal(s) \u00D7 \u20B9${fmt(userValues.chargePerGuestMeal)}`}
                    />
                )}

                {/* ── CALCULATIONS ── */}
                <SectionLabel label="Calculations" />
                <DataRow
                    label="Cost of Your Meals"
                    value={`\u20B9${fmt(userValues.costOfMeals)}`}
                    subLabel="Proportional share"
                    accent
                />
                <DataRow
                    label="Adjusted Meal Charge"
                    value={`\u20B9${fmt(userValues.adjustedMealCharge)}`}
                    subLabel="After guest deduction"
                    accent
                />
                {userValues.platformFee !== 0 && (
                    <DataRow
                        label="Platform Fee"
                        value={`\u20B9${fmt(userValues.platformFee)}`}
                    />
                )}

                {/* ── PREVIOUS BALANCE (conditional) ── */}
                {userValues.prevBalance !== 0 && (
                    <>
                        <SectionLabel label="Previous Balance" />
                        <DataRow
                            label={userValues.prevBalance > 0 ? 'Outstanding Balance' : 'Credit Balance'}
                            value={`\u20B9${fmt(Math.abs(userValues.prevBalance))}`}
                            subLabel={userValues.prevBalance > 0 ? 'Carried forward from last month' : 'Credit from last month'}
                            accent={userValues.prevBalance > 0}
                        />
                    </>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════
               TOTAL BOX — Amount + Status Badge
               Matches pdf.service.js TOTAL BOX section exactly
               ═══════════════════════════════════════════════════ */}
            <div className="px-3 sm:px-5 pt-2 pb-3">
                <div className={`flex items-center justify-between p-4 rounded-xl border ${totalBoxStyle}`}>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">
                            {amounts.isRefund ? 'Refund Amount' : 'Total Payable'}
                        </p>
                        <p className={`text-xl sm:text-[22px] font-extrabold tabular-nums leading-none ${amountTextStyle}`}>
                            {'\u20B9'}{fmt(amounts.displayAmt)}
                        </p>
                    </div>

                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${badgeStyle}`}>
                        {(status.isPaid || amounts.isRefund) && <HiOutlineCheckCircle className="w-3 h-3" />}
                        {status.label}
                    </span>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
               PAYMENT BLOCK — (paid or partially paid)
               Matches pdf.service.js PAYMENT BLOCK section exactly
               ═══════════════════════════════════════════════════ */}
            {(status.isPaid || status.isPartiallyPaid) && (
                <div className="px-3 sm:px-5 pb-3">
                    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">

                        {/* Payment status row */}
                        <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between border-b border-border/60">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Payment Status
                                </p>
                                <p className="text-sm font-bold text-foreground mt-0.5">
                                    {status.isPaid ? 'Payment Successful' : 'Partially Paid'}
                                </p>
                                {paymentData.paymentMethod && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {paymentData.paymentMethod === 'upi_manual'
                                            ? 'Manual UPI'
                                            : paymentData.paymentMethod === 'razorpay'
                                                ? 'Online (Razorpay)'
                                                : paymentData.paymentMethod}
                                    </p>
                                )}
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                status.isPaid
                                    ? 'bg-success-bg text-success-text border-success-border'
                                    : 'bg-warning-bg text-warning-text border-warning-border'
                            }`}>
                                {status.isPaid ? 'SETTLED' : 'PARTIAL'}
                            </span>
                        </div>

                        {/* Partially paid: amount breakdown */}
                        {status.isPartiallyPaid && (
                            <div className="px-3 sm:px-4 py-2 flex items-center gap-6 border-b border-border/60">
                                <p className="text-[11px] text-muted-foreground">
                                    Paid: <span className="font-bold text-foreground">{'\u20B9'}{fmt(amounts.paidAmount)}</span>
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    Remaining: <span className="font-bold text-foreground">{'\u20B9'}{fmt(amounts.remainingAmount)}</span>
                                </p>
                            </div>
                        )}

                        {/* UTR block (if manual UPI with transaction ID) */}
                        {paymentData.paymentMethod === 'upi_manual' && paymentData.transactionId && (
                            <div className="px-3 sm:px-4 py-2 bg-primary/5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                        UTR
                                    </span>
                                    <span className="text-[13px] font-mono font-bold text-primary select-all break-all">
                                        {paymentData.transactionId}
                                    </span>
                                </div>
                                {paymentData.utr && paymentData.utr !== paymentData.transactionId && (
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Bank UTR: {paymentData.utr}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
               ACTION BUTTONS — Pay Now + Download + Email
               ═══════════════════════════════════════════════════ */}
            <div className="px-3 sm:px-5 pb-3 space-y-2">
                {/* Pay Now */}
                {!status.isPaid && !amounts.isRefund && onPayNow && (
                    <button
                        type="button"
                        disabled={isPaying}
                        onClick={handlePayNow}
                        className={`touch-target w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl text-sm font-bold text-white transition-[transform,opacity,background,box-shadow] duration-150 ease-out active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 ${
                            status.isPartiallyPaid
                                ? 'bg-warning hover:brightness-90 shadow-md hover:shadow-lg'
                                : 'bg-gradient-primary hover:brightness-90 shadow-md hover:shadow-lg'
                        }`}
                    >
                        {isPaying ? (
                            <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                        ) : (
                            <HiOutlineShieldCheck className="w-4 h-4 opacity-80" />
                        )}
                        <span>{isPaying ? 'Processing\u2026' : status.isPartiallyPaid ? 'Pay Remaining Balance' : 'Pay Bill'}</span>
                    </button>
                )}

                {/* Download + Email */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        disabled={isDownloading}
                        onClick={handleDownloadPDF}
                        className="touch-target flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold border bg-card border-border hover:bg-muted active:scale-[0.98] disabled:opacity-60 disabled:scale-100 transition-[transform,opacity,background,border-color] duration-150 ease-out text-foreground shadow-sm"
                    >
                        {isDownloading ? (
                            <Spinner size="sm" color="current" />
                        ) : (
                            <HiOutlineArrowDownTray className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span>Download</span>
                    </button>
                    <button
                        type="button"
                        disabled={sendingEmail}
                        onClick={handleSendEmail}
                        className="touch-target flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold border bg-card border-border hover:bg-muted active:scale-[0.98] disabled:opacity-60 disabled:scale-100 transition-[transform,opacity,background,border-color] duration-150 ease-out text-foreground shadow-sm"
                    >
                        {sendingEmail ? (
                            <Spinner size="sm" color="current" />
                        ) : (
                            <HiOutlineEnvelope className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span>Email</span>
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
               FOOTER — Disclaimer + Powered by
               Matches pdf.service.js FOOTER section exactly
               ═══════════════════════════════════════════════════ */}
            <div className="px-3 sm:px-5 pb-4">
                <div className="border-t border-border pt-3 text-center space-y-1">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        System-generated invoice for {meta.monthName}. For disputes, contact your mess admin.
                    </p>
                    <p className="text-[11px] text-primary/60 font-medium">
                        Powered by United Mess {'\u00B7'} {meta.invoiceNo}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default memo(InvoicePreview);
