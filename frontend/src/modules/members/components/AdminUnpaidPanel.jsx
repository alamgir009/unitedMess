import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    ShieldAlert, ChevronDown, RefreshCw, CheckCircle2,
    Clock, DollarSign, User2, Calendar, Loader2, AlertTriangle,
    BadgeIndianRupee, ArrowRight
} from 'lucide-react';
import { fetchAdminUnpaidInvoices, resolveInvoicePayment } from '../store/members.slice';
import { toast } from 'react-hot-toast';

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

/** Build last 6 months as { label, month, year } options */
function buildMonthOptions() {
    const opts = [];
    const now = new Date();
    for (let i = 1; i <= 6; i++) {
        let m = now.getMonth() + 1 - i; // 1-indexed current month - i
        let y = now.getFullYear();
        if (m <= 0) { m += 12; y--; }
        opts.push({ label: `${MONTHS[m - 1]} ${y}`, month: m, year: y });
    }
    return opts;
}

/* ─────────────────────────────────────────────
   StatusPill
───────────────────────────────────────────── */
const StatusPill = ({ status }) => {
    const map = {
        unpaid: 'bg-rose-50   dark:bg-rose-500/10   text-rose-700  dark:text-rose-400  border-rose-200  dark:border-rose-500/25',
        partially_paid: 'bg-amber-50  dark:bg-amber-500/10  text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25',
        paid: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25',
    };
    const cls = map[status] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    const label = status === 'partially_paid' ? 'Partial' : (status ?? 'unknown');
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-widest border ${cls}`}>
            {label}
        </span>
    );
};

/* ─────────────────────────────────────────────
   ResolveModal — inline quick action
───────────────────────────────────────────── */
const ResolveModal = ({ invoice, onClose, onResolve, isSaving }) => {
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

                {/* Header */}
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

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                            { label: 'Total Bill', value: `₹ ${fmt(invoice.totalPayable)}`, color: 'text-slate-900 dark:text-white' },
                            { label: 'Paid So Far', value: `₹ ${fmt(invoice.paidAmount)}`, color: 'text-emerald-600 dark:text-emerald-400' },
                            { label: 'Outstanding', value: `₹ ${fmt(outstanding)}`, color: 'text-rose-600 dark:text-rose-400' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-3 py-3">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                                <p className={`text-sm font-black tabular-nums ${color}`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Amount input */}
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
                                    ? <Loader2 size={16} className="animate-spin" />
                                    : <CheckCircle2 size={16} />}
                                {isSaving ? 'Saving…' : 'Mark Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   InvoiceRow
───────────────────────────────────────────── */
const InvoiceRow = ({ invoice, onResolve, isSaving }) => {
    const [showModal, setShowModal] = useState(false);
    const outstanding = invoice.totalPayable - invoice.paidAmount;
    const user = invoice.user ?? {};

    return (
        <>
            <div className="grid grid-cols-12 gap-4 items-center px-6 py-4
                            border-b border-slate-100 dark:border-slate-800/70
                            hover:bg-slate-50/70 dark:hover:bg-slate-800/30
                            transition-colors duration-150">
                {/* Member */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                    {user.image ? (
                        <img src={user.image} alt={user.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-slate-900" />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 text-white text-sm font-black">
                            {(user.name?.charAt(0) ?? 'U').toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-[13.5px] font-bold text-slate-900 dark:text-white truncate">{user.name ?? 'Unknown'}</p>
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">{user.email ?? '—'}</p>
                    </div>
                </div>

                {/* Month */}
                <div className="col-span-2">
                    <p className="text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">{invoice.monthName}</p>
                </div>

                {/* Total */}
                <div className="col-span-2 text-right">
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

                {/* Status + Action */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                    <StatusPill status={invoice.status} />
                    <button
                        onClick={() => setShowModal(true)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold
                                   bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400
                                   border border-amber-200 dark:border-amber-500/30
                                   hover:bg-amber-100 dark:hover:bg-amber-500/25
                                   active:scale-95 transition-all duration-150">
                        Resolve <ArrowRight size={11} />
                    </button>
                </div>
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
};

/* ─────────────────────────────────────────────
   AdminUnpaidPanel — root export
───────────────────────────────────────────── */
const AdminUnpaidPanel = () => {
    const dispatch = useDispatch();
    const { unpaidInvoices, unpaidInvoicesLoading } = useSelector(s => s.members);

    const monthOptions = useMemo(() => buildMonthOptions(), []);

    // Default selected = first option (most recent past month)
    const [selected, setSelected] = useState(monthOptions[0]);
    const [savingId, setSavingId] = useState(null);

    // Fetch on mount + when selected month changes
    const load = useCallback((opt) => {
        dispatch(fetchAdminUnpaidInvoices({ month: opt.month, year: opt.year }));
    }, [dispatch]);

    // Initial load
    React.useEffect(() => { load(selected); }, [selected, load]);

    const handleMonthChange = (e) => {
        const idx = parseInt(e.target.value, 10);
        const opt = monthOptions[idx];
        setSelected(opt);
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

    return (
        <section
            aria-label="Administrator Unpaid Bills Panel"
            className="mt-10 w-full"
        >
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
                            Admin view — finalized invoices with outstanding payments
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    {/* Month picker */}
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                            defaultValue={0}
                            onChange={handleMonthChange}
                            className="pl-8 pr-8 py-2.5 rounded-xl text-[12.5px] font-bold
                                       appearance-none cursor-pointer
                                       bg-white dark:bg-slate-900
                                       border border-slate-200 dark:border-slate-700
                                       text-slate-700 dark:text-slate-300
                                       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                                       transition-all duration-150"
                        >
                            {monthOptions.map((opt, i) => (
                                <option key={opt.label} value={i}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => load(selected)}
                        disabled={unpaidInvoicesLoading}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[12.5px] font-bold
                                   bg-white dark:bg-slate-900
                                   border border-slate-200 dark:border-slate-700
                                   text-slate-600 dark:text-slate-400
                                   hover:bg-slate-50 dark:hover:bg-slate-800
                                   active:scale-95 transition-all duration-150
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={13} className={unpaidInvoicesLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Table card ── */}
            <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                {/* Table header */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-center px-6 py-3.5
                                bg-slate-50/80 dark:bg-slate-800/40
                                border-b border-slate-200 dark:border-slate-800">
                    {[
                        { label: 'Member', cols: 'col-span-4' },
                        { label: 'Month', cols: 'col-span-2' },
                        { label: 'Total Bill', cols: 'col-span-2 text-right' },
                        { label: 'Paid', cols: 'col-span-1 text-right' },
                        { label: 'Outstanding', cols: 'col-span-1 text-right' },
                        { label: '', cols: 'col-span-2' },
                    ].map(({ label, cols }) => (
                        <div key={label}
                            className={`${cols} text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500`}>
                            {label}
                        </div>
                    ))}
                </div>

                {/* Loading */}
                {unpaidInvoicesLoading && (
                    <div className="flex items-center justify-center py-16 gap-3">
                        <Loader2 size={20} className="animate-spin text-rose-500" />
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading invoices…</span>
                    </div>
                )}

                {/* Empty state */}
                {!unpaidInvoicesLoading && unpaidInvoices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 size={26} className="text-emerald-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All clear for {selected.label}!</p>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No pending or partial invoices found.</p>
                    </div>
                )}

                {/* Invoice rows */}
                {!unpaidInvoicesLoading && unpaidInvoices.length > 0 && (
                    <div className="flex flex-col">
                        {unpaidInvoices.map(invoice => (
                            <InvoiceRow
                                key={invoice._id}
                                invoice={invoice}
                                onResolve={handleResolve}
                                isSaving={savingId === invoice._id}
                            />
                        ))}
                    </div>
                )}

                {/* Footer count */}
                {!unpaidInvoicesLoading && unpaidInvoices.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-3.5
                                    bg-slate-50/60 dark:bg-slate-800/30
                                    border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={13} className="text-amber-500" />
                            <span className="text-[11.5px] font-bold text-amber-600 dark:text-amber-400">
                                {unpaidInvoices.length} unresolved invoice{unpaidInvoices.length !== 1 ? 's' : ''} for {selected.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            <DollarSign size={11} />
                            Total outstanding: ₹ {fmt(
                                unpaidInvoices.reduce((sum, inv) => sum + (inv.totalPayable - inv.paidAmount), 0)
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AdminUnpaidPanel;
