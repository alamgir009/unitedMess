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
        refunded: 'bg-info-bg text-info-text border-info-border',
    };
    const cls = map[status] ?? 'bg-card text-muted-foreground border-border';
    const label = status === 'partially_paid' ? 'Partial' : status === 'refunded' ? 'Refunded' : (status ?? 'unknown');
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
   ResolveModal
───────────────────────────────────────────── */
const ResolveModal = React.memo(({ invoice, onClose, onResolve, isSaving }) => {
    const { totalPayable, paidAmount } = invoice;
    const outstanding = totalPayable - paidAmount;
    const isRefundMode = outstanding < 0;
    const isSettled = outstanding === 0;

    // Minimum paidAmount allowed after refund:
    //   totalPayable > 0 → 0  (can't go below zero on a positive bill)
    //   totalPayable < 0 → totalPayable (negative bill allows matching negative paidAmount)
    const minAllowedPaid = Math.min(0, totalPayable);

    // Maximum refund amount = current paidAmount - lowest allowed paidAmount
    const maxRefund = paidAmount - minAllowedPaid;

    // Suggested refund: the amount that settles paidAmount to totalPayable
    const suggestedRefund = Math.max(0, paidAmount - totalPayable);

    const defaultAmount = isRefundMode ? String(Math.min(suggestedRefund, maxRefund)) : String(outstanding);
    const [amount, setAmount] = useState(defaultAmount);

    const parsed = parseFloat(amount);
    const clamped = isRefundMode ? Math.min(parsed || 0, maxRefund) : parsed || 0;
    const displayRefund = clamped || (isRefundMode ? maxRefund : 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSettled) { toast.error('Invoice is fully settled — no action needed'); return; }
        const raw = parseFloat(amount);
        if (isNaN(raw) || raw <= 0) { toast.error('Enter a valid positive amount'); return; }
        const safeVal = isRefundMode ? Math.min(raw, maxRefund) : raw;
        const delta = isRefundMode ? -safeVal : safeVal;
        const newPaidAmount = paidAmount + delta;
        if (newPaidAmount < minAllowedPaid) {
            toast.error(`Refund cannot exceed ₹ ${fmt(maxRefund)}`);
            return;
        }
        if (safeVal !== raw) {
            toast(`Amount capped to ₹ ${fmt(maxRefund)} — maximum refundable`, { icon: 'ℹ️' });
        }
        onResolve(invoice._id, newPaidAmount, delta);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay" onClick={onClose}>
            <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-border bg-muted dark:bg-muted/40">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm',
                            isRefundMode
                                ? 'bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 shadow-amber-600/20'
                                : 'bg-gradient-to-br from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500 shadow-emerald-600/20'
                        )}>
                            {isRefundMode ? <RefreshCw size={20} className="text-white" /> : <BadgeIndianRupee size={20} className="text-white" />}
                        </div>
                        <div>
                            <h3 className="text-base font-black text-foreground">{isRefundMode ? 'Process Refund' : 'Resolve Payment'}</h3>
                            <p className="text-xs font-medium text-muted-foreground">
                                {invoice.user?.name ?? 'Member'} — {invoice.monthName}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                            { label: 'Total Bill', value: `₹ ${fmt(totalPayable)}`, color: totalPayable < 0 ? 'text-success-text' : 'text-foreground' },
                            { label: 'Paid So Far', value: `₹ ${fmt(paidAmount)}`, color: 'text-success-text' },
                            { label: 'Outstanding', value: `₹ ${fmt(outstanding)}`, color: outstanding < 0 ? 'text-success-text' : 'text-danger-text' },
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
                                {isRefundMode ? `Refund Amount (max ₹ ${fmt(maxRefund)})` : 'Amount Being Paid Now (₹)'}
                            </label>
                            <div className="relative">
                                <span className={cn(
                                    'absolute inset-y-0 left-4 flex items-center text-sm font-bold',
                                    isRefundMode ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'
                                )}>
                                    {isRefundMode ? '− ₹' : '₹'}
                                </span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={isRefundMode ? maxRefund : undefined}
                                    value={amount}
                                    onChange={e => {
                                        const raw = e.target.value;
                                        if (isRefundMode && raw !== '' && Number(raw) > maxRefund) {
                                            setAmount(String(maxRefund));
                                        } else {
                                            setAmount(raw);
                                        }
                                    }}
                                    disabled={isSettled}
                                    className={cn(
                                        'w-full py-3 rounded-2xl text-base font-bold bg-input border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all disabled:opacity-50',
                                        isRefundMode ? 'pl-16' : 'pl-8'
                                    )}
                                />
                            </div>
                            {isRefundMode && (
                                <p className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    <AlertTriangle size={11} /> −₹ {fmt(displayRefund)} will be deducted — invoice marked as refunded
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold border border-input text-muted-foreground hover:bg-muted active:opacity-80">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSaving || isSettled} className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black text-white dark:text-slate-950 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-md',
                                isRefundMode
                                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-500 dark:to-orange-500'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500'
                            )}>
                                {isSaving ? <Spinner size="sm" color="white" /> : isRefundMode ? <RefreshCw size={16} /> : <CheckCircle2 size={16} />}
                                {isSaving ? 'Saving…' : isRefundMode ? 'Issue Refund' : 'Mark Payment'}
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
   GroupHeader
───────────────────────────────────────────── */
const GroupHeader = React.memo(({ user, count }) => (
    <div className={cn(
        'flex items-center gap-3 px-4 md:px-6 py-4 bg-transparent'
    )}>
        <Avatar src={user?.image} name={user?.name} size="sm" className="ring-2 ring-card shrink-0" />
        <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-bold text-foreground truncate">{user?.name ?? 'Unknown'}</p>
            <p className="text-[11px] font-normal text-muted-foreground truncate">{user?.email ?? '—'}</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-danger-bg text-danger-text border border-danger-border">
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
            navigator.clipboard.writeText(invoice._id).then(() => toast.success('Invoice ID copied')).catch(console.error);
        }
    }, [invoice._id]);

    const handleCloseModal = useCallback(() => setShowModal(false), []);
    const handleResolveInvoice = useCallback((id, amt, delta) => {
        onResolve(id, amt, delta);
        setShowModal(false);
    }, [onResolve]);

    return (
        <>
            {/* Desktop row */}
            <div className={cn(
                'hidden md:grid grid-cols-12 gap-3 items-center px-6 py-4',
                'border-b border-border',
                'hover:bg-muted/30 hover:shadow-sm',
                'transition-all'
            )}>
                <div className="col-span-3 flex items-center gap-2 min-w-0 pl-[44px]">
                    <span className="text-[11px] font-mono font-semibold text-muted-foreground">{refId}</span>
                    <button onClick={handleCopyRef} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Copy size={11} /></button>
                </div>
                <div className="col-span-2"><p className="text-[12px] font-semibold text-muted-foreground">{invoice.monthName}</p></div>
                <div className="col-span-1"><p className="text-[12px] font-bold tabular-nums text-foreground">{fmt(invoice.mealCount)}</p></div>
                <div className="col-span-1"><p className="text-[12px] font-bold tabular-nums text-foreground">₹{fmt(invoice.marketAmountSpent)}</p></div>
                <div className="col-span-1"><p className="text-[12.5px] font-bold tabular-nums text-foreground">₹{fmt(invoice.totalPayable)}</p></div>
                <div className="col-span-1"><p className="text-[12.5px] font-bold tabular-nums text-success-text">₹{fmt(invoice.paidAmount)}</p></div>
                <div className="col-span-1"><p className="text-[12.5px] font-bold tabular-nums text-danger-text">₹{fmt(outstanding)}</p></div>
                <div className="col-span-1 flex items-center justify-start"><StatusPill status={invoice.status} /></div>
                <div className="col-span-1 flex justify-end">
                    <button onClick={() => setShowModal(true)} disabled={isSaving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors shadow-sm">
                        {isSaving ? <Spinner size="xs" color="white" /> : <ArrowRight size={13} className="stroke-[2.5]" />}
                        {isSaving ? 'Saving' : 'Resolve'}
                    </button>
                </div>
            </div>

            {/* Mobile row */}
            <div className="md:hidden flex flex-col gap-3 p-4 border-b border-border bg-card last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-semibold text-muted-foreground">{refId}</span>
                        <button onClick={handleCopyRef} className="p-0.5 rounded hover:bg-muted"><Copy size={9} /></button>
                    </div>
                    <StatusPill status={invoice.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col gap-1 bg-muted dark:bg-muted/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-muted-foreground">Period</span>
                        <span className="text-[12.5px] font-bold text-foreground">{invoice.monthName}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-muted dark:bg-muted/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-muted-foreground">Meals</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-foreground">{fmt(invoice.mealCount)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-muted dark:bg-muted/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-muted-foreground">Market</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-foreground">₹ {fmt(invoice.marketAmountSpent)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-muted dark:bg-muted/40 rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-muted-foreground">Total</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-foreground">₹ {fmt(invoice.totalPayable)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-success-bg rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-success-text">Paid</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-success-text">₹ {fmt(invoice.paidAmount)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-danger-bg rounded-xl px-3 py-2.5">
                        <span className="text-[9px] font-bold text-danger-text">Due</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-danger-text">₹ {fmt(outstanding)}</span>
                    </div>
                </div>
                <button onClick={() => setShowModal(true)} disabled={isSaving}
                    className="flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 min-h-[44px] shadow-md">
                    {isSaving ? <Spinner size="sm" color="white" /> : <BadgeIndianRupee size={16} />}
                    {isSaving ? 'Processing…' : `Resolve — ₹ ${fmt(outstanding)}`}
                </button>
            </div>

            {showModal && <ResolveModal invoice={invoice} isSaving={isSaving} onClose={handleCloseModal} onResolve={handleResolveInvoice} />}
        </>
    );
});
InvoiceRow.displayName = 'InvoiceRow';

/* ─────────────────────────────────────────────
   AdminUnpaidPanel
───────────────────────────────────────────── */
const AdminUnpaidPanel = React.memo(() => {
    const dispatch = useDispatch();
    const { unpaidInvoices, unpaidInvoicesLoading, unpaidInvoicesError } = useSelector(s => s.members);

    const [billingRefreshKey, setBillingRefreshKey] = useState(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const monthOptions = useMemo(() => buildMonthOptions(), [billingRefreshKey]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [savingId, setSavingId] = useState(null);

    const safeMonthOptions = useMemo(
        () => monthOptions.length > 0 ? monthOptions : [{ label: '—', month: undefined, year: undefined, isLastFinalized: true }],
        [monthOptions]
    );
    const selected = useMemo(() => safeMonthOptions[selectedIdx] ?? safeMonthOptions[0], [selectedIdx, safeMonthOptions]);

    const load = useCallback((opt) => {
        if (!opt.month || !opt.year) return;
        dispatch(fetchAdminUnpaidInvoices({ month: opt.month, year: opt.year }));
    }, [dispatch]);

    useEffect(() => { load(selected); }, [selected, load]);

    const lastDateRef = useRef(new Date().getDate());
    useEffect(() => {
        const interval = setInterval(() => {
            if (new Date().getDate() !== lastDateRef.current) {
                lastDateRef.current = new Date().getDate();
                setBillingRefreshKey(k => k + 1);
            }
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleMonthChange = (e) => setSelectedIdx(parseInt(e.target.value, 10));
    const handleResolve = useCallback(async (invoiceId, paidAmount, delta) => {
        setSavingId(invoiceId);
        try {
            const isRefund = delta !== undefined && delta < 0;
            await dispatch(resolveInvoicePayment({ invoiceId, paidAmount, delta })).unwrap();
            toast.success(isRefund ? 'Refund recorded successfully' : 'Payment recorded successfully');
        } catch (err) {
            toast.error(err?.message || 'Failed to update payment');
        } finally {
            setSavingId(null);
        }
    }, [dispatch]);

    const totalOutstanding = useMemo(
        () => unpaidInvoices.reduce((sum, inv) => {
            if (inv.status === 'refunded') return sum;
            return sum + Math.max(0, inv.totalPayable - inv.paidAmount);
        }, 0),
        [unpaidInvoices]
    );

    const isLastFinalizedPeriod = useMemo(() => {
        const lp = getLastFinalizedPeriod();
        return lp.month === selected.month && lp.year === selected.year;
    }, [selected.month, selected.year]);

    // ─────────────────────────────────────────────────────────────────────────
    // FINAL FIX: Fintech-grade robust grouping – deduplicates members even if
    // user representations differ (string vs object, different ID fields, etc.)
    // ─────────────────────────────────────────────────────────────────────────
    const groupedInvoices = useMemo(() => {
        const groupMap = new Map(); // key: normalized user identifier

        for (const inv of unpaidInvoices) {
            // 1. Extract a reliable user identifier from the invoice
            let rawUser = inv.user;
            let userId = null;
            let userObj = null;

            if (!rawUser) {
                // fallback: use a placeholder for missing user
                userId = 'unknown';
                userObj = { _id: 'unknown', name: 'Unknown Member', email: '' };
            } else if (typeof rawUser === 'string') {
                userId = rawUser.trim();
                userObj = { _id: userId, name: 'Unknown', email: '' };
            } else if (typeof rawUser === 'object') {
                // Try to get a stable ID: _id (most common), id, or generate from email/name
                const idFromObject = rawUser._id ?? rawUser.id ?? null;
                if (idFromObject) {
                    userId = String(idFromObject).trim();
                } else if (rawUser.email) {
                    userId = `email:${rawUser.email}`;
                } else if (rawUser.name) {
                    userId = `name:${rawUser.name}`;
                } else {
                    userId = 'unknown';
                }
                userObj = { ...rawUser, _id: userId };
                // Ensure name and email are at least empty strings
                userObj.name = userObj.name || 'Unknown';
                userObj.email = userObj.email || '';
            }

            // 2. If group already exists, push invoice and optionally merge user data
            if (groupMap.has(userId)) {
                const existing = groupMap.get(userId);
                existing.invoices.push(inv);
                // Merge user info: prefer existing if it has a real name/email
                if (userObj && (userObj.name !== 'Unknown' || userObj.email) && (existing.user.name === 'Unknown' && !existing.user.email)) {
                    existing.user = { ...existing.user, ...userObj };
                }
            } else {
                groupMap.set(userId, { user: userObj, invoices: [inv] });
            }
        }

        // Convert to array and sort by member name
        return Array.from(groupMap.values()).sort((a, b) =>
            (a.user?.name || '').localeCompare(b.user?.name || '')
        );
    }, [unpaidInvoices]);

    return (
        <section className="w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 pb-5 md:pt-0 md:pb-5 px-4 md:px-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/30">
                        <ShieldAlert size={20} className="text-amber-600 dark:text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Unresolved Bills</h2>
                        <p className="text-xs font-normal text-muted-foreground mt-0.5">Admin view — invoices with outstanding payments</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <div className="relative flex items-center">
                        <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <select value={selectedIdx} onChange={handleMonthChange}
                            className="pl-9 pr-9 py-2 rounded-full text-[13px] font-semibold appearance-none bg-card border border-slate-200 dark:border-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                            {safeMonthOptions.map((opt, i) => (
                                <option key={opt.label} value={i}>{opt.isLastFinalized ? `★ ${opt.label}` : opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                    <button onClick={() => load(selected)} disabled={unpaidInvoicesLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-card border border-slate-200 dark:border-slate-800 text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer">
                        <RefreshCw size={13} className={unpaidInvoicesLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Error */}
            {unpaidInvoicesError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive mb-4 mx-4 md:mx-0">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold">Failed to load unresolved invoices</p>
                        <p className="text-xs mt-0.5 opacity-80">{unpaidInvoicesError}</p>
                    </div>
                    <button onClick={() => load(selected)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-destructive/10 hover:bg-destructive/20">Retry</button>
                </div>
            )}

            {/* Table Card */}
            <div className="w-full bg-card md:rounded-3xl border-y md:border border-border md:shadow-sm overflow-hidden">
                {/* Desktop Header */}
                <div className="hidden md:grid grid-cols-12 gap-3 items-center px-6 py-3.5 bg-slate-50/75 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="col-span-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Invoice</div>
                    <div className="col-span-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Period</div>
                    <div className="col-span-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Meals</div>
                    <div className="col-span-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Market</div>
                    <div className="col-span-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total</div>
                    <div className="col-span-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paid</div>
                    <div className="col-span-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Due</div>
                    <div className="col-span-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</div>
                    <div className="col-span-1 text-right text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Action</div>
                </div>

                {/* Loading */}
                {unpaidInvoicesLoading && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Spinner size="md" />
                        <span className="text-sm font-medium text-muted-foreground mt-3">Loading invoices…</span>
                    </div>
                )}

                {/* Empty States */}
                {!unpaidInvoicesLoading && unpaidInvoices.length === 0 && isLastFinalizedPeriod && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-14 h-14 rounded-full bg-border dark:bg-muted flex items-center justify-center"><Calendar size={26} className="text-muted-foreground" /></div>
                        <p className="text-sm font-bold text-muted-foreground">Last finalized period: {selected.label}</p>
                        <p className="text-xs font-medium text-muted-foreground max-w-sm text-center">All invoices resolved. Switch month above.</p>
                    </div>
                )}

                {!unpaidInvoicesLoading && unpaidInvoices.length === 0 && !isLastFinalizedPeriod && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-14 h-14 rounded-full bg-success-bg flex items-center justify-center"><CheckCircle2 size={26} className="text-success-text" /></div>
                        <p className="text-sm font-bold text-foreground">All clear for {selected.label}!</p>
                    </div>
                )}

                {/* Grouped Rows */}
                {!unpaidInvoicesLoading && groupedInvoices.length > 0 && (
                    <div className="flex flex-col">
                        {groupedInvoices.map((group) => (
                            <div key={group.user?._id || 'unknown'} className="flex flex-col">
                                <GroupHeader user={group.user} count={group.invoices.length} />
                                {group.invoices.map(invoice => (
                                    <InvoiceRow key={invoice._id} invoice={invoice} onResolve={handleResolve} isSaving={savingId === invoice._id} />
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                {!unpaidInvoicesLoading && unpaidInvoices.length > 0 && (
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between px-4 md:px-6 py-3.5 bg-muted/60 dark:bg-muted/30 border-t border-border">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={13} className="text-warning-text" />
                            <span className="text-[11.5px] font-bold text-warning-text">
                                {unpaidInvoices.length} unresolved invoice{unpaidInvoices.length !== 1 ? 's' : ''} across {groupedInvoices.length} member{groupedInvoices.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                            <DollarSign size={11} /> Total outstanding: ₹ {fmt(totalOutstanding)}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
});
AdminUnpaidPanel.displayName = 'AdminUnpaidPanel';

export default AdminUnpaidPanel;