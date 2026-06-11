import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    ShieldAlert, ChevronDown, RefreshCw, CheckCircle2,
    DollarSign, Calendar, AlertTriangle,
    BadgeIndianRupee, ArrowRight, Copy
} from 'lucide-react';
import { fetchAdminUnpaidInvoices, resolveInvoicePayment } from '../store/members.slice';
import { toast } from 'react-hot-toast';
import { Spinner } from '@/shared/components/ui';
import { cn } from '@/core/utils/helpers/string.helper';

// FIX: Import centralized billing period utilities from shared source of truth.
// Eliminates the duplicated local getBillingPeriod() that drifted from backend logic.
import { getLastFinalizedPeriod } from '@shared/utils/billingPeriod';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const fmt = (n) =>
    typeof n === 'number'
        ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
        : (n ?? '—');

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// FIX: Build month options from the LAST FINALIZED period as the default,
// so on day 11+ the admin sees the just-finalized month's unpaid bills first.
function buildMonthOptions() {
    const { month: lpMonth, year: lpYear } = getLastFinalizedPeriod();
    const opts = [];
    for (let i = 0; i < 12; i++) {
        let m = lpMonth - i;
        let y = lpYear;
        if (m <= 0) { m += 12; y--; }
        opts.push({
            label: `${MONTHS[m - 1]} ${y}`,
            month: m,
            year: y,
            isLastFinalized: i === 0,
        });
    }
    return opts;
}

function shortRef(id) {
    if (!id) return '---';
    const str = typeof id === 'string' ? id : String(id);
    return `#${str.slice(-6).toUpperCase()}`;
}

/* ─────────────────────────────────────────────
   StatusPill
───────────────────────────────────────────── */
const StatusPill = React.memo(({ status }) => {
    const map = {
        unpaid: 'bg-rose-50   dark:bg-rose-500/10   text-rose-700  dark:text-rose-400  border-rose-200  dark:border-rose-500/25',
        partially_paid: 'bg-amber-50  dark:bg-amber-500/10  text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25',
        paid: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25',
    };
    const cls = map[status] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    const label = status === 'partially_paid' ? 'Partial' : (status ?? 'unknown');
    return (
        <span className={cn(
            'inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-widest border',
            cls
        )}>
            {label}
        </span>
    );
});
StatusPill.displayName = 'StatusPill';

/* ─────────────────────────────────────────────
   ResolveModal — inline quick action
───────────────────────────────────────────── */
const ResolveModal = React.memo(({ invoice, onClose, onResolve, isSaving }) => {
    const outstanding = invoice.totalPayable - invoice.paidAmount;
    const [amount, setAmount] = useState(String(Math.max(0, outstanding)));

    const handleSubmit = (e) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (isNaN(val) || val < 0) { toast.error('Enter a valid amount'); return; }
        onResolve(invoice._id, invoice.paidAmount + val);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}>
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                onClick={e => e.stopPropagation()}>

                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <BadgeIndianRupee size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Resolve Payment</h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {invoice.user?.name ?? 'Member'} — {invoice.monthName}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                            { label: 'Total Bill', value: `₹ ${fmt(invoice.totalPayable)}`, color: 'text-slate-900 dark:text-white' },
                            { label: 'Paid So Far', value: `₹ ${fmt(invoice.paidAmount)}`, color: 'text-emerald-600 dark:text-emerald-400' },
                            { label: 'Outstanding', value: `₹ ${fmt(outstanding)}`, color: 'text-rose-600 dark:text-rose-400' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-3 py-3">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                                <p className={cn('text-sm font-black tabular-nums', color)}>{value}</p>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                                Amount Being Paid Now (₹)
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 dark:text-slate-500 text-sm font-bold">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 rounded-2xl text-base font-bold
                                               bg-slate-50 dark:bg-slate-800
                                               border border-slate-200 dark:border-slate-700
                                               text-slate-900 dark:text-white
                                               focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500
                                               transition-all duration-150"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={onClose}
                                className="flex-1 py-3 rounded-2xl text-sm font-bold
                                           border border-slate-200 dark:border-slate-700
                                           text-slate-600 dark:text-slate-400
                                           hover:bg-slate-100 dark:hover:bg-slate-800
                                           active:scale-95 transition-all duration-150">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSaving}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold
                                           bg-amber-500 hover:bg-amber-600 text-white
                                           shadow-lg shadow-amber-500/30
                                           active:scale-95 transition-all duration-150
                                           disabled:opacity-60 disabled:cursor-not-allowed">
                                {isSaving
                                    ? <Spinner size="sm" color="white" />
                                    : <CheckCircle2 size={16} />}
                                {isSaving ? 'Saving…' : 'Mark Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
});
ResolveModal.displayName = 'ResolveModal';

/* ─────────────────────────────────────────────
   GroupHeader — member grouping header row
───────────────────────────────────────────── */
const GroupHeader = React.memo(({ user, count }) => (
    <div className={cn(
        'flex items-center gap-3 px-6 py-3.5',
        'bg-slate-50/90 dark:bg-slate-800/50',
        'border-b border-slate-100 dark:border-slate-800/70'
    )}>
        {user?.image ? (
            <img src={user.image} alt={user.name}
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-slate-900" />
        ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 text-white text-xs font-black">
                {(user?.name?.charAt(0) ?? 'U').toUpperCase()}
            </div>
        )}
        <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">{user?.name ?? 'Unknown'}</p>
            <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 truncate">{user?.email ?? '—'}</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold
                        bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400
                        border border-rose-200 dark:border-rose-500/25">
            <AlertTriangle size={10} />
            {count} unresolved
        </span>
    </div>
));
GroupHeader.displayName = 'GroupHeader';

/* ─────────────────────────────────────────────
   InvoiceRow
───────────────────────────────────────────── */
const InvoiceRow = React.memo(({ invoice, onResolve, isSaving }) => {
    const [showModal, setShowModal] = useState(false);
    const outstanding = useMemo(() => invoice.totalPayable - invoice.paidAmount, [invoice.totalPayable, invoice.paidAmount]);
    const refId = useMemo(() => shortRef(invoice._id), [invoice._id]);

    const handleCopyRef = useCallback(() => {
        if (invoice._id) {
            navigator.clipboard.writeText(invoice._id).then(() => {
                toast.success('Invoice ID copied');
            }).catch(() => {});
        }
    }, [invoice._id]);

    return (
        <>
            {/* ── Desktop row ── */}
            <div className={cn(
                'hidden md:grid grid-cols-12 gap-3 items-center px-6 py-4',
                'border-b border-slate-100 dark:border-slate-800/70',
                'hover:bg-slate-50/70 dark:hover:bg-slate-800/30',
                'transition-colors duration-150'
            )}>
                {/* Member + Ref */}
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                    {invoice.user?.image ? (
                        <img src={invoice.user.image} alt={invoice.user.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-slate-900" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 text-white text-xs font-black">
                            {(invoice.user?.name?.charAt(0) ?? 'U').toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{invoice.user?.name ?? 'Unknown'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500">{refId}</span>
                            <button
                                onClick={handleCopyRef}
                                className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                                title="Copy full invoice ID"
                                aria-label="Copy invoice ID"
                            >
                                <Copy size={10} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Month */}
                <div className="col-span-2">
                    <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">{invoice.monthName}</p>
                </div>

                {/* Meals */}
                <div className="col-span-1">
                    <p className="text-[12px] font-bold tabular-nums text-slate-700 dark:text-slate-300">{fmt(invoice.mealCount)}</p>
                </div>

                {/* Market */}
                <div className="col-span-1">
                    <p className="text-[12px] font-bold tabular-nums text-slate-700 dark:text-slate-300">₹ {fmt(invoice.marketAmountSpent)}</p>
                </div>

                {/* Total Payable */}
                <div className="col-span-1 text-right">
                    <p className="text-[13px] font-black tabular-nums text-slate-800 dark:text-slate-100">₹ {fmt(invoice.totalPayable)}</p>
                </div>

                {/* Paid */}
                <div className="col-span-1 text-right">
                    <p className="text-[12px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">₹ {fmt(invoice.paidAmount)}</p>
                </div>

                {/* Outstanding */}
                <div className="col-span-1 text-right">
                    <p className="text-[13px] font-black tabular-nums text-rose-600 dark:text-rose-400">₹ {fmt(outstanding)}</p>
                </div>

                {/* Status */}
                <div className="col-span-1 flex justify-center">
                    <StatusPill status={invoice.status} />
                </div>

                {/* Action */}
                <div className="col-span-1 flex justify-end">
                    <button
                        onClick={() => setShowModal(true)}
                        disabled={isSaving}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold',
                            'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
                            'border border-amber-200 dark:border-amber-500/30',
                            'hover:bg-amber-100 dark:hover:bg-amber-500/25',
                            'active:scale-95 transition-all duration-150',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                    >
                        {isSaving ? <Spinner size="xs" color="current" /> : <ArrowRight size={11} />}
                        {isSaving ? 'Saving' : 'Resolve'}
                    </button>
                </div>
            </div>

            {/* ── Mobile card ── */}
            <div className={cn(
                'md:hidden flex flex-col gap-3 p-4 mx-3 mb-3',
                'bg-white dark:bg-slate-900 rounded-2xl',
                'border border-slate-200 dark:border-slate-800',
                'shadow-sm'
            )}>
                {/* Header: member + status */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {invoice.user?.image ? (
                            <img src={invoice.user.image} alt={invoice.user.name}
                                className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-slate-900" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 text-white text-sm font-black">
                                {(invoice.user?.name?.charAt(0) ?? 'U').toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-[14px] font-bold text-slate-900 dark:text-white truncate">{invoice.user?.name ?? 'Unknown'}</p>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500">{refId}</span>
                                <button
                                    onClick={handleCopyRef}
                                    className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                                    aria-label="Copy invoice ID"
                                >
                                    <Copy size={9} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <StatusPill status={invoice.status} />
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Period</span>
                        <span className="text-[12.5px] font-bold text-slate-700 dark:text-slate-300">{invoice.monthName}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Meals</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-slate-700 dark:text-slate-300">{fmt(invoice.mealCount)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Market</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-slate-700 dark:text-slate-300">₹ {fmt(invoice.marketAmountSpent)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-slate-700 dark:text-slate-300">₹ {fmt(invoice.totalPayable)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">Paid</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300">₹ {fmt(invoice.paidAmount)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-rose-50 dark:bg-rose-500/10 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest">Due</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-rose-700 dark:text-rose-300">₹ {fmt(outstanding)}</span>
                    </div>
                </div>

                {/* Resolve button */}
                <button
                    onClick={() => setShowModal(true)}
                    disabled={isSaving}
                    className={cn(
                        'flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold',
                        'bg-amber-500 hover:bg-amber-600 text-white',
                        'shadow-lg shadow-amber-500/30',
                        'active:scale-[0.98] transition-all duration-150',
                        'disabled:opacity-60 disabled:cursor-not-allowed',
                        'min-h-[44px]'
                    )}
                >
                    {isSaving ? <Spinner size="sm" color="white" /> : <BadgeIndianRupee size={16} />}
                    {isSaving ? 'Processing…' : `Resolve — ₹ ${fmt(outstanding)}`}
                </button>
            </div>

            {showModal && (
                <ResolveModal
                    invoice={invoice}
                    isSaving={isSaving}
                    onClose={() => setShowModal(false)}
                    onResolve={(id, amt) => {
                        onResolve(id, amt);
                        setShowModal(false);
                    }}
                />
            )}
        </>
    );
});
InvoiceRow.displayName = 'InvoiceRow';

/* ─────────────────────────────────────────────
   AdminUnpaidPanel — root export
───────────────────────────────────────────── */
const AdminUnpaidPanel = React.memo(() => {
    const dispatch = useDispatch();
    const { unpaidInvoices, unpaidInvoicesLoading, unpaidInvoicesError } = useSelector(s => s.members);

    // FIX: billingRefreshKey forces monthOptions to recompute across month boundaries
    // even without component remount. Increases on midnight detection.
    const [billingRefreshKey, setBillingRefreshKey] = useState(0);

    // FIX: monthOptions now depends on billingRefreshKey so it re-evaluates
    // when the date changes across the 10th/11th boundary.
    const monthOptions = useMemo(() => buildMonthOptions(),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [billingRefreshKey]
    );

    const [selectedIdx, setSelectedIdx] = useState(0);
    const [savingId, setSavingId] = useState(null);

    // FIX: guard against monthOptions being empty or missing
    const safeMonthOptions = monthOptions.length > 0 ? monthOptions : [{
        label: '—', month: undefined, year: undefined, isLastFinalized: true
    }];

    const selected = useMemo(
        () => safeMonthOptions[selectedIdx] ?? safeMonthOptions[0],
        [selectedIdx, safeMonthOptions]
    );

    const load = useCallback((opt) => {
        if (!opt.month || !opt.year) return;
        dispatch(fetchAdminUnpaidInvoices({ month: opt.month, year: opt.year }));
    }, [dispatch]);

    useEffect(() => { load(selected); }, [selected, load]);

    // FIX: Check for midnight boundary (±1 day) to refresh month options
    // when the date crosses the 10th/11th boundary while the component stays mounted.
    const lastDateRef = useRef(new Date().getDate());
    useEffect(() => {
        const interval = setInterval(() => {
            const currentDate = new Date().getDate();
            if (currentDate !== lastDateRef.current) {
                lastDateRef.current = currentDate;
                setBillingRefreshKey(k => k + 1);
            }
        }, 60000); // check every 60 seconds
        return () => clearInterval(interval);
    }, []);

    const handleMonthChange = (e) => {
        setSelectedIdx(parseInt(e.target.value, 10));
    };

    const handleResolve = useCallback(async (invoiceId, paidAmount) => {
        setSavingId(invoiceId);
        try {
            await dispatch(resolveInvoicePayment({ invoiceId, paidAmount })).unwrap();
            toast.success('Payment recorded successfully');
        } catch (err) {
            toast.error(err?.message || 'Failed to update payment');
        } finally {
            setSavingId(null);
        }
    }, [dispatch]);

    const totalOutstanding = useMemo(
        () => unpaidInvoices.reduce((sum, inv) => sum + (inv.totalPayable - inv.paidAmount), 0),
        [unpaidInvoices]
    );

    /* ── Determine if selected month is the most-recently finalized period ── */
    const isLastFinalizedPeriod = useMemo(() => {
        const lp = getLastFinalizedPeriod();
        return lp.month === selected.month && lp.year === selected.year;
    }, [selected.month, selected.year]);

    /* ── Group invoices by member ── */
    const groupedInvoices = useMemo(() => {
        const groups = {};
        unpaidInvoices.forEach(inv => {
            const uid = inv.user?._id || 'unknown';
            if (!groups[uid]) {
                groups[uid] = { user: inv.user, invoices: [] };
            }
            groups[uid].invoices.push(inv);
        });
        return Object.values(groups).sort((a, b) =>
            (a.user?.name || '').localeCompare(b.user?.name || '')
        );
    }, [unpaidInvoices]);

    return (
        <section aria-label="Administrator Unpaid Bills Panel" className="mt-10 w-full">

            {/* ── Section header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-rose-500 shadow-lg shadow-rose-500/25">
                        <ShieldAlert size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
                            Unresolved Bills
                        </h2>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                Admin view — invoices with outstanding payments
                            </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    {/* Month picker */}
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                            value={selectedIdx}
                            onChange={handleMonthChange}
                            className={cn(
                                'pl-8 pr-8 py-2.5 rounded-xl text-[12.5px] font-bold',
                                'appearance-none cursor-pointer',
                                'bg-white dark:bg-slate-900',
                                'border border-slate-200 dark:border-slate-700',
                                'text-slate-700 dark:text-slate-300',
                                'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
                                'transition-all duration-150'
                            )}
                        >
                            {safeMonthOptions.map((opt, i) => (
                                <option key={opt.label} value={i}>
                                    {opt.isLastFinalized ? `★ ${opt.label}` : opt.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => load(selected)}
                        disabled={unpaidInvoicesLoading}
                        className={cn(
                            'flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[12.5px] font-bold',
                            'bg-white dark:bg-slate-900',
                            'border border-slate-200 dark:border-slate-700',
                            'text-slate-600 dark:text-slate-400',
                            'hover:bg-slate-50 dark:hover:bg-slate-800',
                            'active:scale-95 transition-all duration-150',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            'min-h-[44px]'
                        )}
                    >
                        <RefreshCw size={13} className={unpaidInvoicesLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Error banner ── */}
            {unpaidInvoicesError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 mb-4">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Failed to load unresolved invoices</p>
                        <p className="text-xs font-medium mt-0.5 opacity-80 text-red-500 dark:text-red-500">{unpaidInvoicesError}</p>
                    </div>
                    <button
                        onClick={() => load(selected)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/30 active:scale-95 transition-all duration-150 shrink-0"
                    >
                        <RefreshCw size={12} />
                        Retry
                    </button>
                </div>
            )}

            {/* ── Table card ── */}
            <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                {/* Desktop table header */}
                <div className={cn(
                    'hidden md:grid grid-cols-12 gap-3 items-center px-6 py-3.5',
                    'bg-slate-50/80 dark:bg-slate-800/40',
                    'border-b border-slate-200 dark:border-slate-800'
                )}>
                    <div className="col-span-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Member / Ref</div>
                    <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Period</div>
                    <div className="col-span-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Meals</div>
                    <div className="col-span-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Market</div>
                    <div className="col-span-1 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Total</div>
                    <div className="col-span-1 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Paid</div>
                    <div className="col-span-1 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Due</div>
                    <div className="col-span-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Status</div>
                    <div className="col-span-1 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">Action</div>
                </div>

                {/* Loading */}
                {unpaidInvoicesLoading && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Spinner size="md" color="current" className="text-rose-500" />
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading invoices…</span>
                    </div>
                )}

                {/* Empty — last finalized period (not yet settled) */}
                {!unpaidInvoicesLoading && unpaidInvoices.length === 0 && isLastFinalizedPeriod && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Calendar size={26} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                            Last finalized period: {selected.label}
                        </p>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 max-w-sm text-center">
                            All invoices for this period are resolved. Switch to another month above.
                        </p>
                    </div>
                )}

                {/* Empty — non-finalized or older period, all resolved */}
                {!unpaidInvoicesLoading && unpaidInvoices.length === 0 && !isLastFinalizedPeriod && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 size={26} className="text-emerald-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All clear for {selected.label}!</p>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No pending or partial invoices found.</p>
                    </div>
                )}

                {/* Invoice rows — grouped by member */}
                {!unpaidInvoicesLoading && groupedInvoices.length > 0 && (
                    <div className="flex flex-col">
                        {groupedInvoices.map((group) => (
                            <div key={group.user?._id || 'unknown'} className="flex flex-col">
                                <GroupHeader user={group.user} count={group.invoices.length} />
                                {group.invoices.map(invoice => (
                                    <InvoiceRow
                                        key={invoice._id}
                                        invoice={invoice}
                                        onResolve={handleResolve}
                                        isSaving={savingId === invoice._id}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer count */}
                {!unpaidInvoicesLoading && unpaidInvoices.length > 0 && (
                    <div className={cn(
                        'flex items-center justify-between px-6 py-3.5',
                        'bg-slate-50/60 dark:bg-slate-800/30',
                        'border-t border-slate-100 dark:border-slate-800'
                    )}>
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={13} className="text-amber-500" />
                            <span className="text-[11.5px] font-bold text-amber-600 dark:text-amber-400">
                                {unpaidInvoices.length} unresolved invoice{unpaidInvoices.length !== 1 ? 's' : ''} across {groupedInvoices.length} member{groupedInvoices.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            <DollarSign size={11} />
                            Total outstanding: ₹ {fmt(totalOutstanding)}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
});
AdminUnpaidPanel.displayName = 'AdminUnpaidPanel';

export default AdminUnpaidPanel;
