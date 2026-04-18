import React from 'react';
import {
    Mail, Phone, ShieldCheck, Flame, Droplets,
    Utensils, Receipt, Users, Banknote, Hash,
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
const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3.5">
        <div
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                       bg-slate-100 dark:bg-slate-800
                       text-slate-500 dark:text-slate-400"
        >
            <Icon size={16} strokeWidth={2} />
        </div>
        <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.07em] mb-0.5">
                {label}
            </span>
            <span className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                {value ?? 'N/A'}
            </span>
        </div>
    </div>
);

/* ─────────────────────────────────────────────
   InvoiceCard — large financial metric tile
───────────────────────────────────────────── */
const GRADIENT_MAP = {
    amber:   'from-amber-500  to-orange-500  dark:from-amber-400  dark:to-orange-400',
    blue:    'from-blue-600   to-indigo-600  dark:from-blue-400   dark:to-indigo-400',
    emerald: 'from-emerald-600 to-teal-500  dark:from-emerald-400 dark:to-teal-400',
    indigo:  'from-indigo-600 to-violet-600 dark:from-indigo-400  dark:to-violet-400',
};

const ICON_MAP = {
    amber:   'bg-amber-50   dark:bg-amber-500/15  text-amber-600  dark:text-amber-400  border-amber-200  dark:border-amber-500/25',
    blue:    'bg-blue-50    dark:bg-blue-500/15   text-blue-600   dark:text-blue-400   border-blue-200   dark:border-blue-500/25',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25',
    indigo:  'bg-indigo-50  dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-200  dark:border-indigo-500/25',
};

const InvoiceCard = ({ label, amount, accent = 'blue', subtext, icon: Icon }) => (
    <div
        className="group relative overflow-hidden flex flex-col p-5 md:p-6
                   bg-white dark:bg-slate-900
                   rounded-2xl border border-slate-200 dark:border-slate-800
                   shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700
                   transition-all duration-200"
    >
        {/* Header row */}
        <div className="flex items-start justify-between mb-5">
            <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.07em] leading-tight max-w-[9rem]">
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
            <span className="mt-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-snug">
                {subtext}
            </span>
        )}

        {/* Hover accent bar */}
        <div
            className={`absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r ${GRADIENT_MAP[accent]}
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
        />
    </div>
);

/* ─────────────────────────────────────────────
   MiniMetric — compact breakdown row tile
───────────────────────────────────────────── */
const MiniMetric = ({ icon: Icon, label, value, subtext }) => (
    <div
        className="flex items-center justify-between gap-3
                   px-4 py-3.5 rounded-2xl
                   bg-white dark:bg-slate-900
                   border border-slate-200 dark:border-slate-800
                   shadow-sm hover:border-blue-400/40 dark:hover:border-blue-500/30
                   transition-colors duration-200"
    >
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
            <div
                className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
                           bg-slate-50 dark:bg-slate-800
                           text-slate-400 dark:text-slate-500"
            >
                <Icon size={15} strokeWidth={2} />
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.07em] truncate">
                {label}
            </span>
        </div>

        {/* Right */}
        <div className="text-right shrink-0">
            <div className="text-[13.5px] md:text-[14px] font-black text-slate-900 dark:text-white leading-tight tabular-nums">
                {value}
            </div>
            {subtext && (
                <div className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                    {subtext}
                </div>
            )}
        </div>
    </div>
);

/* ─────────────────────────────────────────────
   Section heading component
───────────────────────────────────────────── */
const SectionHeading = ({ color = 'blue-500', children }) => (
    <div className="flex items-center gap-3 mb-5">
        <div className={`w-1 h-5 rounded-full bg-${color}`} />
        <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {children}
        </h4>
    </div>
);

/* ─────────────────────────────────────────────
   MemberInvoiceDetails — root component
───────────────────────────────────────────── */
const MemberInvoiceDetails = ({ user }) => {
    return (
        <div className="w-full animate-[expandIn_0.35s_cubic-bezier(0.22,1,0.36,1)_both]">

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

                {/* ════════════════════════════════
                    Left column — Identity panel
                ════════════════════════════════ */}
                <div
                    className="xl:col-span-4 flex flex-col
                               bg-white dark:bg-slate-900
                               rounded-2xl border border-slate-200 dark:border-slate-800
                               shadow-sm p-5 md:p-6"
                >
                    <SectionHeading color="blue-500">Identity &amp; Contact</SectionHeading>

                    <div className="flex flex-col gap-4 flex-1">
                        <InfoItem icon={Mail}        label="Email Address" value={user?.email} />
                        <InfoItem icon={Phone}       label="Phone Number"  value={user?.phone} />
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
                        className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800
                                   flex items-center justify-between gap-3"
                    >
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
                            <Hash size={10} strokeWidth={2.5} />
                            User ID
                        </div>
                        <span
                            title={user?._id ?? user?.id}
                            className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400
                                       truncate max-w-[160px] bg-slate-50 dark:bg-slate-800
                                       px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                        <MiniMetric
                            icon={Utensils}
                            label="Own Meals"
                            value={fmt(user?.totalMeal ?? 0)}
                            subtext="total count"
                        />
                        <MiniMetric
                            icon={Users}
                            label="Guest Meals"
                            value={fmt(user?.guestMeal ?? 0)}
                            subtext={`₹${fmt(user?.chargePerGuestMeal ?? 0)} each`}
                        />
                        <MiniMetric
                            icon={Flame}
                            label="Gas Charge"
                            value={`₹\u202F${fmt(user?.gasBillCharge ?? 0)}`}
                        />
                        <MiniMetric
                            icon={Droplets}
                            label="Water Bill"
                            value={`₹\u202F${fmt(user?.waterBill ?? 0)}`}
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
                            icon={Receipt}
                            label="Total Market Amount"
                            amount={user?.totalMarketAmount ?? 0}
                            accent="blue"
                            subtext="Combined market purchases & contributions"
                        />
                    </div>

                    {/* ── Net position summary bar ── */}
                    <NetPositionBar user={user} />
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
};

/* ─────────────────────────────────────────────
   NetPositionBar
     === 0  → Settled  (slate)
      < 0  → Credit   (emerald) — show abs value, refund message
      > 0  → Due      (rose)   — show value, payment message
───────────────────────────────────────────── */
const NetPositionBar = ({ user }) => {
    const payable  = user?.paybleAmountforMeal ?? 0;
    const isZero   = payable === 0;
    const isDue    = payable > 0;
    const isCredit = payable < 0;

    const containerCls = isZero
        ? 'bg-slate-50      dark:bg-slate-800/40   border-slate-200   dark:border-slate-700'
        : isDue
            ? 'bg-rose-50/60    dark:bg-rose-500/10    border-rose-200    dark:border-rose-500/25'
            : 'bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25';

    const amountCls = isZero
        ? 'text-slate-600   dark:text-slate-300'
        : isDue
            ? 'text-rose-700    dark:text-rose-400'
            : 'text-emerald-700 dark:text-emerald-400';

    const badgeCls = isZero
        ? 'bg-slate-100   dark:bg-slate-700       text-slate-600   dark:text-slate-300   border-slate-300   dark:border-slate-600'
        : isDue
            ? 'bg-rose-100    dark:bg-rose-500/20    text-rose-700    dark:text-rose-400    border-rose-300    dark:border-rose-500/30'
            : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30';

    const badge   = isZero ? 'Settled' : isDue ? 'Due' : 'Credit';
    const label   = isZero
        ? 'Already settled'
        : isDue
            ? 'You have to pay'
            : 'You will get a refund of';

    return (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-2xl border ${containerCls}`}>
            <div className="flex flex-col gap-0.5">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-slate-400 dark:text-slate-500">
                    Payable Amount
                </span>

                {isZero ? (
                    <span className="text-base font-bold text-slate-500 dark:text-slate-400">
                        Already settled — no balance outstanding
                    </span>
                ) : (
                    <span className={`text-xl font-black tabular-nums ${amountCls}`}>
                        {label}&nbsp;₹&nbsp;{fmt(Math.abs(payable))}
                    </span>
                )}
            </div>

            <span className={`self-start sm:self-center px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-widest border ${badgeCls}`}>
                {badge}
            </span>
        </div>
    );
};

export default MemberInvoiceDetails;