import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    ShieldAlert, ChevronDown, RefreshCw, CheckCircle2,
    DollarSign, Calendar, AlertTriangle,
    BadgeIndianRupee, ArrowRight, Copy
} from 'lucide-react';
import { fetchAdminUnpaidInvoices, resolveInvoicePayment } from '../store/members.slice';
import { toast } from 'react-hot-toast';
import { Spinner, Avatar } from '@/shared/components/ui';
import { cn } from '@/core/utils/helpers/string.helper';
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
        unpaid: 'bg-danger-bg text-danger-text border-danger-border',
        partially_paid: 'bg-warning-bg text-warning-text border-warning-border',
        paid: 'bg-success-bg text-success-text border-success-border',
    };
    const cls = map[status] ?? 'bg-card text-muted-foreground border-border';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay"
            onClick={onClose}>
            <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border overflow-hidden"
                onClick={e => e.stopPropagation()}>

                <div className="px-6 py-5 border-b border-border bg-muted dark:bg-muted/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500 flex items-center justify-center shadow-sm shadow-emerald-600/20">
                            <BadgeIndianRupee size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-foreground">Resolve Payment</h3>
                            <p className="text-xs font-medium text-muted-foreground">
                                {invoice.user?.name ?? 'Member'} — {invoice.monthName}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                            { label: 'Total Bill', value: `₹ ${fmt(invoice.totalPayable)}`, color: 'text-foreground' },
                            { label: 'Paid So Far', value: `₹ ${fmt(invoice.paidAmount)}`, color: 'text-success-text' },
                            { label: 'Outstanding', value: `₹ ${fmt(outstanding)}`, color: 'text-danger-text' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-muted dark:bg-muted/60 rounded-2xl px-3 py-3">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                                <p className={cn('text-sm font-black tabular-nums', color)}>{value}</p>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                                Amount Being Paid Now (₹)
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-4 flex items-center text-muted-foreground text-sm font-bold">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 rounded-2xl text-base font-bold
                                               bg-input
                                               border border-input
                                               text-foreground
                                               focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary
                                               transition-[border-color,box-shadow] duration-150"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={onClose}
                                className="flex-1 py-3 rounded-xl text-sm font-bold
                                           border border-input
                                           text-muted-foreground
                                           hover:bg-muted
                                           active:opacity-80 transition-[opacity,background] duration-150">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSaving}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black
                                           bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500
                                           text-white dark:text-slate-950
                                           hover:brightness-105 active:scale-[0.98] transition-[filter,transform,opacity] duration-150
                                           disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 dark:shadow-emerald-500/10">
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
        'flex items-center gap-3 px-4 md:px-6 py-3.5',
        'bg-muted/90 dark:bg-muted/50',
        'border-b border-border'
    )}>
        <Avatar src={user?.image} name={user?.name} size="sm" className="ring-2 ring-card shrink-0" />
        <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-foreground truncate">{user?.name ?? 'Unknown'}</p>
            <p className="text-[10.5px] font-medium text-muted-foreground truncate">{user?.email ?? '—'}</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold
                        bg-danger-bg text-danger-text
                        border border-danger-border">
            <AlertTriangle size={10} />
            {count} unresolved
        </span>
    </div>
), (prev, next) => {
    return prev.count === next.count
        && prev.user?._id === next.user?._id
        && prev.user?.name === next.user?.name
        && prev.user?.image === next.user?.image
        && prev.user?.email === next.user?.email;
});
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
            }).catch((err) => console.error('Failed to copy invoice ID:', err));
        }
    }, [invoice._id]);

    const handleCloseModal = useCallback(() => setShowModal(false), []);
    const handleResolveInvoice = useCallback((id, amt) => {
        onResolve(id, amt);
        setShowModal(false);
    }, [onResolve]);

    return (
        <>
            {/* ── Desktop row ── */}
            <div className={cn(
                'hidden md:grid grid-cols-12 gap-3 items-center px-6 py-4',
                'border-b border-border',
                'hover:bg-muted/30 hover:shadow-sm',
                'transition-[background,box-shadow] duration-150'
            )}>
                {/* Invoice Ref */}
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono font-semibold text-muted-foreground">{refId}</span>
                    <button
                        onClick={handleCopyRef}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors"
                        title="Copy full invoice ID"
                        aria-label="Copy invoice ID"
                    >
                        <Copy size={10} />
                    </button>
                </div>

                {/* Month */}
                <div className="col-span-2">
                    <p className="text-[12px] font-semibold text-muted-foreground">{invoice.monthName}</p>
                </div>

                {/* Meals */}
                <div className="col-span-1">
                    <p className="text-[12px] font-bold tabular-nums text-foreground">{fmt(invoice.mealCount)}</p>
                </div>

                {/* Market */}
                <div className="col-span-1">
                    <p className="text-[12px] font-bold tabular-nums text-foreground">₹{fmt(invoice.marketAmountSpent)}</p>
                </div>

                {/* Total Payable */}
                <div className="col-span-1 text-right">
                    <p className="text-[13px] font-black tabular-nums text-foreground">₹{fmt(invoice.totalPayable)}</p>
                </div>

                {/* Paid */}
                <div className="col-span-1 text-right">
                    <p className="text-[12px] font-bold tabular-nums text-success-text">₹{fmt(invoice.paidAmount)}</p>
                </div>

                {/* Outstanding */}
                <div className="col-span-1 text-right">
                    <p className="text-[13px] font-black tabular-nums text-danger-text">₹{fmt(outstanding)}</p>
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
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-black',
                            'bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500',
                            'text-white dark:text-slate-950',
                            'hover:brightness-105 active:scale-[0.98] transition-[filter,transform,opacity] duration-150',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            'shadow-sm shadow-emerald-600/10 dark:shadow-emerald-500/5'
                        )}
                    >
                        {isSaving ? <Spinner size="xs" color="white" /> : <ArrowRight size={11} />}
                        {isSaving ? 'Saving' : 'Resolve'}
                    </button>
                </div>
            </div>

            {/* ── Mobile row (Flat Edge-to-Edge) ── */}
            <div className={cn(
                'md:hidden flex flex-col gap-3 p-4 border-b border-border bg-card last:border-b-0'
            )}>
                {/* Header: ref + status */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono font-semibold text-muted-foreground">{refId}</span>
                        <button
                            onClick={handleCopyRef}
                            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors"
                            aria-label="Copy invoice ID"
                        >
                            <Copy size={9} />
                        </button>
                    </div>
                    <StatusPill status={invoice.status} />
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col gap-1 bg-muted dark:bg-muted/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Period</span>
                        <span className="text-[12.5px] font-bold text-foreground">{invoice.monthName}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-muted dark:bg-muted/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Meals</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-foreground">{fmt(invoice.mealCount)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-muted dark:bg-muted/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Market</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-foreground">₹ {fmt(invoice.marketAmountSpent)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-muted dark:bg-muted/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-foreground">₹ {fmt(invoice.totalPayable)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-success-bg rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-success-text uppercase tracking-widest">Paid</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-success-text">₹ {fmt(invoice.paidAmount)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-danger-bg rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-danger-text uppercase tracking-widest">Due</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-danger-text">₹ {fmt(outstanding)}</span>
                    </div>
                </div>

                {/* Resolve button */}
                <button
                    onClick={() => setShowModal(true)}
                    disabled={isSaving}
                    className={cn(
                        'flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black',
                        'bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500',
                        'text-white dark:text-slate-950',
                        'hover:brightness-105 active:scale-[0.98] transition-[filter,transform,opacity] duration-150',
                        'disabled:opacity-60 disabled:cursor-not-allowed',
                        'min-h-[44px]',
                        'shadow-md shadow-emerald-600/20 dark:shadow-emerald-500/10'
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
                    onClose={handleCloseModal}
                    onResolve={handleResolveInvoice}
                />
            )}
        </>
    );
}, (prevProps, nextProps) => {
    const a = prevProps.invoice;
    const b = nextProps.invoice;
    return a._id === b._id
        && a.status === b.status
        && a.totalPayable === b.totalPayable
        && a.paidAmount === b.paidAmount
        && prevProps.isSaving === nextProps.isSaving
        && prevProps.onResolve === nextProps.onResolve;
});
InvoiceRow.displayName = 'InvoiceRow';

/* ─────────────────────────────────────────────
   AdminUnpaidPanel — root export
───────────────────────────────────────────── */
const AdminUnpaidPanel = React.memo(() => {
    const dispatch = useDispatch();
    const { unpaidInvoices, unpaidInvoicesLoading, unpaidInvoicesError } = useSelector(s => s.members);

    const [billingRefreshKey, setBillingRefreshKey] = useState(0);
    const monthOptions = useMemo(() => buildMonthOptions(), [billingRefreshKey]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [savingId, setSavingId] = useState(null);

    const safeMonthOptions = useMemo(
        () => monthOptions.length > 0 ? monthOptions : [{
            label: '—', month: undefined, year: undefined, isLastFinalized: true
        }],
        [monthOptions]
    );

    const selected = useMemo(
        () => safeMonthOptions[selectedIdx] ?? safeMonthOptions[0],
        [selectedIdx, safeMonthOptions]
    );

    const load = useCallback((opt) => {
        if (!opt.month || !opt.year) return;
        dispatch(fetchAdminUnpaidInvoices({ month: opt.month, year: opt.year }));
    }, [dispatch]);

    useEffect(() => { load(selected); }, [selected, load]);

    const lastDateRef = useRef(new Date().getDate());
    useEffect(() => {
        const interval = setInterval(() => {
            const currentDate = new Date().getDate();
            if (currentDate !== lastDateRef.current) {
                lastDateRef.current = currentDate;
                setBillingRefreshKey(k => k + 1);
            }
        }, 60000);
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

    const isLastFinalizedPeriod = useMemo(() => {
        const lp = getLastFinalizedPeriod();
        return lp.month === selected.month && lp.year === selected.year;
    }, [selected.month, selected.year]);

    // ✅ FIX: Robust grouping – normalises user IDs and merges user objects
    const groupedInvoices = useMemo(() => {
        const groupMap = new Map(); // key = normalized userId

        for (const inv of unpaidInvoices) {
            // 1. Normalize user ID
            let userId;
            let userObj = null;

            if (typeof inv.user === 'string') {
                userId = inv.user;
                userObj = { _id: inv.user, name: 'Unknown', email: '' };
            } else if (inv.user && typeof inv.user === 'object') {
                userId = inv.user._id ? String(inv.user._id) : 'unknown';
                userObj = { ...inv.user, _id: userId }; // ensure _id is string
            } else {
                userId = 'unknown';
                userObj = { _id: 'unknown', name: 'Unknown Member', email: '' };
            }

            // 2. If group exists, add invoice; otherwise create new group
            if (groupMap.has(userId)) {
                groupMap.get(userId).invoices.push(inv);
            } else {
                groupMap.set(userId, {
                    user: userObj,
                    invoices: [inv]
                });
            }
        }

        // 3. Convert to array and sort by member name
        return Array.from(groupMap.values()).sort((a, b) =>
            (a.user?.name || '').localeCompare(b.user?.name || '')
        );
    }, [unpaidInvoices]);

    return (
        <section aria-label="Administrator Unpaid Bills Panel" className="w-full">

            {/* ── Section header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 pb-5 md:pt-0 md:pb-5 px-4 md:px-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-warning">
                        <ShieldAlert size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-foreground tracking-tight leading-none">
                            Unresolved Bills
                        </h2>
                            <p className="text-xs font-medium text-muted-foreground mt-0.5">
                                Admin view — invoices with outstanding payments
                            </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    {/* Month picker */}
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <select
                            value={selectedIdx}
                            onChange={handleMonthChange}
                            className={cn(
                                'pl-8 pr-8 py-2.5 rounded-xl text-[12.5px] font-bold',
                                'appearance-none cursor-pointer',
                                'bg-card',
                                'border border-input',
                                'text-foreground',
                                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary',
                                'transition-[border-color,box-shadow] duration-150'
                            )}
                        >
                            {safeMonthOptions.map((opt, i) => (
                                <option key={opt.label} value={i}>
                                    {opt.isLastFinalized ? `★ ${opt.label}` : opt.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => load(selected)}
                        disabled={unpaidInvoicesLoading}
                        className={cn(
                            'flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[12.5px] font-bold',
                            'bg-card',
                            'border border-input',
                            'text-muted-foreground',
                            'hover:bg-muted',
                            'active:opacity-80 transition-opacity duration-150',
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
                <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive mb-4 mx-4 md:mx-0">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-destructive">Failed to load unresolved invoices</p>
                        <p className="text-xs font-medium mt-0.5 opacity-80 text-destructive">{unpaidInvoicesError}</p>
                    </div>
                    <button
                        onClick={() => load(selected)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 active:opacity-80 transition-[opacity,background] duration-150 shrink-0"
                    >
                        <RefreshCw size={12} />
                        Retry
                    </button>
                </div>
            )}

            {/* ── Table card ── */}
            <div className="w-full bg-card md:rounded-3xl border-y md:border border-border md:shadow-sm shadow-none overflow-hidden">

                {/* Desktop table header */}
                <div className={cn(
                    'hidden md:grid grid-cols-12 gap-3 items-center px-6 py-3.5',
                    'bg-muted/80 dark:bg-muted/40',
                    'border-b border-border'
                )}>
                    <div className="col-span-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Invoice</div>
                    <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Period</div>
                    <div className="col-span-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Meals</div>
                    <div className="col-span-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Market</div>
                    <div className="col-span-1 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Total</div>
                    <div className="col-span-1 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Paid</div>
                    <div className="col-span-1 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Due</div>
                    <div className="col-span-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Status</div>
                    <div className="col-span-1 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Action</div>
                </div>

                {/* Loading */}
                {unpaidInvoicesLoading && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Spinner size="md" color="current" className="text-destructive" />
                        <span className="text-sm font-medium text-muted-foreground">Loading invoices…</span>
                    </div>
                )}

                {/* Empty — last finalized period (not yet settled) */}
                {!unpaidInvoicesLoading && unpaidInvoices.length === 0 && isLastFinalizedPeriod && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-14 h-14 rounded-full bg-border dark:bg-muted flex items-center justify-center">
                            <Calendar size={26} className="text-muted-foreground" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">
                            Last finalized period: {selected.label}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground max-w-sm text-center">
                            All invoices for this period are resolved. Switch to another month above.
                        </p>
                    </div>
                )}

                {/* Empty — non-finalized or older period, all resolved */}
                {!unpaidInvoicesLoading && unpaidInvoices.length === 0 && !isLastFinalizedPeriod && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-14 h-14 rounded-full bg-success-bg flex items-center justify-center">
                            <CheckCircle2 size={26} className="text-success-text" />
                        </div>
                        <p className="text-sm font-bold text-foreground">All clear for {selected.label}!</p>
                        <p className="text-xs font-medium text-muted-foreground">No pending or partial invoices found.</p>
                    </div>
                )}

                {/* Invoice rows — grouped by member (fixed) */}
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
                        'flex flex-col md:flex-row gap-3 items-center justify-between px-4 md:px-6 py-3.5',
                        'bg-muted/60 dark:bg-muted/30',
                        'border-t border-border text-center md:text-left'
                    )}>
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={13} className="text-warning-text shrink-0" />
                            <span className="text-[11.5px] font-bold text-warning-text">
                                {unpaidInvoices.length} unresolved invoice{unpaidInvoices.length !== 1 ? 's' : ''} across {groupedInvoices.length} member{groupedInvoices.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
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