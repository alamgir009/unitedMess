import React, { useMemo } from 'react';
import {
    Mail, Phone, ShieldCheck, Flame, Droplets,
    Utensils, Users, Banknote, Hash, Fuel,
    CheckCircle2, Clock, XCircle, ArrowDownToLine,ReceiptIndianRupee
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Shared helpers
───────────────────────────────────────────── */
const fmt = (n) =>
    typeof n === 'number'
        ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
        : (n ?? 'N/A');

/* ─────────────────────────────────────────────
   InfoItem — contact/identity row
───────────────────────────────────────────── */
const InfoItem = React.memo(({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3.5">
        <div
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                       bg-muted
                       text-muted-foreground"
        >
            <Icon size={16} strokeWidth={2} />
        </div>
        <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.07em] mb-0.5">
                {label}
            </span>
            <span className="text-[13.5px] font-semibold text-foreground truncate">
                {value ?? 'N/A'}
            </span>
        </div>
    </div>
));
InfoItem.displayName = 'InfoItem';

/* ─────────────────────────────────────────────
   InvoiceCard — large financial metric tile
───────────────────────────────────────────── */
const GRADIENT_MAP = {
    amber: 'from-amber-500  to-orange-500  dark:from-amber-400  dark:to-orange-400',
    blue: 'from-blue-600   to-indigo-600  dark:from-blue-400   dark:to-indigo-400',
    emerald: 'from-emerald-600 to-teal-500  dark:from-emerald-400 dark:to-teal-400',
    indigo: 'from-indigo-600 to-violet-600 dark:from-indigo-400  dark:to-violet-400',
};

const ICON_MAP = {
    amber: 'bg-amber-50   dark:bg-amber-500/15  text-amber-600  dark:text-amber-400  border-amber-200  dark:border-amber-500/25',
    blue: 'bg-blue-50    dark:bg-blue-500/15   text-blue-600   dark:text-blue-400   border-blue-200   dark:border-blue-500/25',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25',
    indigo: 'bg-indigo-50  dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-200  dark:border-indigo-500/25',
};

const InvoiceCard = React.memo(({ label, amount, accent = 'blue', subtext, icon: Icon }) => (
    <div
        className="group relative overflow-hidden flex flex-col p-5 md:p-6
                    bg-card
                    rounded-2xl border border-border
                    shadow-sm hover:shadow-md hover:border-border
                   transition-all duration-200"
    >
        {/* Header row */}
        <div className="flex items-start justify-between mb-5">
            <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-[0.07em] leading-tight max-w-[9rem]">
                {label}
            </span>
            {Icon && (
                <div className={`shrink-0 p-2 rounded-xl border ${ICON_MAP[accent]}`}>
                    <Icon size={16} strokeWidth={2.5} />
                </div>
            )}
        </div>

        {/* Amount */}
        <span
            className={`text-2xl md:text-3xl font-black tabular-nums bg-clip-text text-transparent bg-gradient-to-r ${GRADIENT_MAP[accent]}`}
        >
            {typeof amount === 'number' ? `₹\u202F${fmt(amount)}` : amount}
        </span>

        {subtext && (
            <span className="mt-1.5 text-[11px] font-medium text-muted-foreground leading-snug">
                {subtext}
            </span>
        )}

        {/* Hover accent bar */}
        <div
            className={`absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r ${GRADIENT_MAP[accent]}
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
        />
    </div>
));
InvoiceCard.displayName = 'InvoiceCard';

/* ─────────────────────────────────────────────
   MiniMetric — compact breakdown row tile
───────────────────────────────────────────── */
const MiniMetric = React.memo(({ icon: Icon, label, value, subtext }) => (
    <div
        className="flex items-center justify-between gap-3
                   px-4 py-3.5 rounded-2xl
                   bg-card
                   border border-border
                   shadow-sm hover:border-primary/30
                   transition-colors duration-200"
    >
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
            <div
                className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
                           bg-muted
                           text-muted-foreground"
            >
                <Icon size={15} strokeWidth={2} />
            </div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.07em] truncate">
                {label}
            </span>
        </div>

        {/* Right */}
        <div className="text-right shrink-0">
            <div className="text-[13.5px] md:text-[14px] font-black text-foreground leading-tight tabular-nums">
                {value}
            </div>
            {subtext && (
                <div className="text-[10.5px] font-medium text-muted-foreground mt-0.5">
                    {subtext}
                </div>
            )}
        </div>
    </div>
));
MiniMetric.displayName = 'MiniMetric';

/* ─────────────────────────────────────────────
   Section heading component
───────────────────────────────────────────── */
const SectionHeading = React.memo(({ color = 'blue-500', children }) => (
    <div className="flex items-center gap-3 mb-5">
        <div className={`w-1 h-5 rounded-full bg-${color}`} />
        <h4 className="text-base font-black text-foreground tracking-tight leading-none">
            {children}
        </h4>
    </div>
));
SectionHeading.displayName = 'SectionHeading';

/* ─────────────────────────────────────────────
   MemberInvoiceDetails — root component
───────────────────────────────────────────── */
const MemberInvoiceDetails = React.memo(({ user }) => {
    const formattedMeals = useMemo(() => fmt(user?.totalMeal ?? 0), [user?.totalMeal]);
    const formattedGuest = useMemo(() => fmt(user?.guestMeal ?? 0), [user?.guestMeal]);
    const formattedCooking = useMemo(() => fmt(user?.cookingCharge ?? 0), [user?.cookingCharge]);
    const formattedGas = useMemo(() => fmt(user?.gasBillCharge ?? 0), [user?.gasBillCharge]);
    const formattedWater = useMemo(() => fmt(user?.waterBill ?? 0), [user?.waterBill]);
    const formattedPlatform = useMemo(() => fmt(user?.platformFee ?? 0), [user?.platformFee]);
    const formattedGuestRate = useMemo(() => fmt(user?.chargePerGuestMeal ?? 0), [user?.chargePerGuestMeal]);

    return (
        <div className="w-full animate-[expandIn_0.35s_cubic-bezier(0.22,1,0.36,1)_both]">

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

                {/* ════════════════════════════════
                    Left column — Identity panel
                ════════════════════════════════ */}
                <div
                    className="xl:col-span-4 flex flex-col
                               bg-card
                               rounded-2xl border border-border
                               shadow-sm p-5 md:p-6"
                >
                    <SectionHeading color="blue-500">Identity &amp; Contact</SectionHeading>

                    <div className="flex flex-col gap-4 flex-1">
                        <InfoItem icon={Mail} label="Email Address" value={user?.email} />
                        <InfoItem icon={Phone} label="Phone Number" value={user?.phone} />
                        <InfoItem
                            icon={ShieldCheck}
                            label="System Role"
                            value={
                                <span className="capitalize">
                                    {user?.role ?? 'member'}
                                </span>
                            }
                        />
                    </div>

                    {/* User ID footer */}
                    <div
                        className="mt-5 pt-4 border-t border-border
                                   flex items-center justify-between gap-3"
                    >
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
                            <Hash size={10} strokeWidth={2.5} />
                            User ID
                        </div>
                        <span
                            title={user?._id ?? user?.id}
                            className="text-[11px] font-mono font-semibold text-muted-foreground
                                       truncate max-w-[160px] bg-muted
                                       px-2 py-1 rounded-md border border-border"
                        >
                            {user?._id ?? user?.id ?? '—'}
                        </span>
                    </div>
                </div>

                {/* ════════════════════════════════
                    Right column — Financial breakdown
                ════════════════════════════════ */}
                <div className="xl:col-span-8 flex flex-col gap-5">

                    <div className="px-1">
                        <SectionHeading color="amber-500">Financial Statement</SectionHeading>
                    </div>

                    {/* ── Mini metrics grid ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        <MiniMetric
                            icon={Utensils}
                            label="Own Meals"
                            value={formattedMeals}
                            subtext="total count"
                        />
                        <MiniMetric
                            icon={Users}
                            label="Guest Meals"
                            value={formattedGuest}
                            subtext={`₹${formattedGuestRate} each`}
                        />
                        <MiniMetric
                            icon={Flame}
                            label="Cooking Charge"
                            value={`₹\u202F${formattedCooking}`}
                            subtext="monthly fixed"
                        />
                        <MiniMetric
                            icon={Fuel}
                            label="Gas Bill"
                            value={`₹\u202F${formattedGas}`}
                            subtext="per member share"
                        />
                        <MiniMetric
                            icon={Droplets}
                            label="Water Bill"
                            value={`₹\u202F${formattedWater}`}
                            subtext="per member share"
                        />
                        <MiniMetric
                            icon={ReceiptIndianRupee}
                            label="Platform Fee"
                            value={`₹\u202F${formattedPlatform}`}
                            subtext="fixed service fee"
                        />
                    </div>

                    {/* ── Grand total cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InvoiceCard
                            icon={Banknote}
                            label="Payable Meal Amount"
                            amount={user?.paybleAmountforMeal ?? 0}
                            accent="amber"
                            subtext="Based on meal count × monthly rate"
                        />
                        <InvoiceCard
                            icon={ReceiptIndianRupee}
                            label="Total Market Amount"
                            amount={user?.totalMarketAmount ?? 0}
                            accent="blue"
                            subtext="Combined market purchases & contributions"
                        />
                    </div>

                    {/* ── Net position summary bar ── */}
                    <PaymentStatusBanner user={user} />
                </div>
            </div>

            <style>{`
                @keyframes expandIn {
                    from { opacity: 0; transform: scale(0.985) translateY(6px); }
                    to   { opacity: 1; transform: scale(1)     translateY(0);   }
                }
            `}</style>
        </div>
    );
});
MemberInvoiceDetails.displayName = 'MemberInvoiceDetails';

/* ─────────────────────────────────────────────
   PaymentStatusBanner — fintech-grade payable summary
     Driven by payment status first, then amount.
     Overpayments / negative balances → credit.
───────────────────────────────────────────── */
const PAYMENT_CONFIG = {
    paid: {
        container: 'bg-success-bg border-success-border',
        text:      'text-success',
        badge:     'bg-success-bg text-success border-success-border',
        iconBox:   'bg-success-bg border-success-border text-success',
        icon:      CheckCircle2,
        label:     'Paid',
        message:   (a) => `Payment of ₹\u202F${a} completed successfully`,
    },
    due: {
        container: 'bg-warning-bg border-warning-border',
        text:      'text-warning',
        badge:     'bg-warning-bg text-warning border-warning-border',
        iconBox:   'bg-warning-bg border-warning-border text-warning',
        icon:      Clock,
        label:     'Due',
        message:   (a) => `You have to pay ₹\u202F${a}`,
    },
    failed: {
        container: 'bg-danger-bg border-danger-border',
        text:      'text-danger',
        badge:     'bg-danger-bg text-danger border-danger-border',
        iconBox:   'bg-danger-bg border-danger-border text-danger',
        icon:      XCircle,
        label:     'Failed',
        message:   (a) => `Payment failed — ₹\u202F${a} is due immediately`,
    },
    settled: {
        container: 'bg-muted border-border',
        text:      'text-muted-foreground',
        badge:     'bg-muted text-muted-foreground border-border',
        iconBox:   'bg-muted border-border text-muted-foreground',
        icon:      CheckCircle2,
        label:     'Settled',
        message:   () => 'Already settled — no balance outstanding',
    },
    credit: {
        container: 'bg-success-bg border-success-border',
        text:      'text-success',
        badge:     'bg-success-bg text-success border-success-border',
        iconBox:   'bg-success-bg border-success-border text-success',
        icon:      ArrowDownToLine,
        label:     'Credit',
        message:   (a) => `You will get a refund of ₹\u202F${a}`,
    },
};

const PaymentStatusBanner = React.memo(({ user }) => {
    const paymentStatus = (user?.payment || 'pending').toLowerCase();
    const payable      = user?.paybleAmountforMeal ?? 0;
    const absPayable   = useMemo(() => Math.abs(payable), [payable]);
    const fmtPayable   = useMemo(() => fmt(absPayable), [absPayable]);

    /* ── Resolve state ── */
    let state;
    if (payable < 0) {
        state = 'credit';
    } else if (['success', 'paid', 'approved'].includes(paymentStatus)) {
        state = 'paid';
    } else if (['failed', 'denied'].includes(paymentStatus)) {
        state = 'failed';
    } else if (payable === 0) {
        state = 'settled';
    } else {
        state = 'due';
    }

    const cfg = PAYMENT_CONFIG[state];
    const Icon = cfg.icon;

    return (
        <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-2xl border transition-colors duration-300 ${cfg.container}`}
            role="status"
            aria-label={`Payment status: ${cfg.label}`}
        >
            {/* ── Left: Icon + message ── */}
            <div className="flex items-center gap-3.5 min-w-0">
                <div
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                                shadow-sm border ${cfg.iconBox}`}
                >
                    <Icon size={18} strokeWidth={2.5} className={cfg.text} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                        Payable Amount
                    </span>
                    <span className={`text-[15px] md:text-[17px] font-black tabular-nums leading-tight ${cfg.text}`}>
                        {cfg.message(fmtPayable)}
                    </span>
                </div>
            </div>

            {/* ── Right: Pill badge ── */}
            <span
                className={`self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                            text-[11px] font-black uppercase tracking-[0.08em] border shadow-sm ${cfg.badge}`}
            >
                <Icon size={13} strokeWidth={3} />
                {cfg.label}
            </span>
        </div>
    );
});
PaymentStatusBanner.displayName = 'PaymentStatusBanner';

export default MemberInvoiceDetails;
