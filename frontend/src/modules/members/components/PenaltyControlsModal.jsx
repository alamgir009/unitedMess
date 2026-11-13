import React, { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, RotateCcw, Gauge, HandCoins } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import { cn } from '@/core/utils/helpers/string.helper';

/* ─────────────────────────────────────────────
    PenaltyControlsModal — ADMIN-ONLY controls.
    Rendered exclusively from AdminUnpaidPanel (an admin surface) — and the
    backend enforces the same rule with authorize('admin'), so hiding the
    modal from members is defense-in-depth, not the security boundary.
───────────────────────────────────────────── */
const fmt = (n) =>
    typeof n === 'number'
        ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
        : (n ?? '0');

const PenaltyControlsModal = React.memo(({
    invoice,
    onClose,
    onWaive,
    onSetRate,
    isSaving,
    isRateSaving,
}) => {
    const penalty = invoice?.penalty ?? {};
    const accrued = Number(penalty.accruedAmount) || 0;
    const waived = Number(penalty.waivedAmount) || 0;
    const net = Number(penalty.netPenaltyAmount) || 0;
    const days = Number(penalty.daysOverdue) || 0;
    const rate = Number(penalty.dailyRate) || 0;

    const remaining = Math.max(0, accrued - waived);

    // ── Waive form ──
    const [waiveAmount, setWaiveAmount] = useState(remaining > 0 ? String(remaining) : '');
    const [waiveReason, setWaiveReason] = useState('');

    // ── Rate override form ──
    const [newRate, setNewRate] = useState(rate ? String(rate) : '');
    const [rateReason, setRateReason] = useState('');

    const [error, setError] = useState(null);

    const istDue = useMemo(() => {
        try {
            if (!penalty.dueDate) return '—';
            return new Intl.DateTimeFormat('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                timeZone: 'Asia/Kolkata',
            }).format(new Date(penalty.dueDate));
        } catch {
            return '—';
        }
    }, [penalty.dueDate]);

    const handleWaive = async (e) => {
        e.preventDefault();
        setError(null);
        const reason = waiveReason.trim();
        if (reason.length < 5) {
            const msg = 'A reason of at least 5 characters is required to waive';
            setError(msg); toast.error(msg); return;
        }
        const raw = parseFloat(waiveAmount);
        if (isNaN(raw) || raw <= 0) {
            const msg = 'Enter a valid positive waiver amount';
            setError(msg); toast.error(msg); return;
        }
        if (raw > remaining + 1) {
            const msg = `Waiver cannot exceed the accrued penalty (₹ ${fmt(remaining)})`;
            setError(msg); toast.error(msg); return;
        }
        const ok = await onWaive(invoice._id, { action: 'waive', amount: raw, reason });
        if (ok) onClose();
    };

    const handleUnwaive = async (e) => {
        e.preventDefault();
        setError(null);
        const reason = waiveReason.trim();
        if (reason.length < 5) {
            const msg = 'A reason of at least 5 characters is required to reverse a waiver';
            setError(msg); toast.error(msg); return;
        }
        const ok = await onWaive(invoice._id, { action: 'unwaive', reason });
        if (ok) onClose();
    };

    const handleSetRate = async (e) => {
        e.preventDefault();
        setError(null);
        const raw = parseFloat(newRate);
        if (isNaN(raw) || raw < 0) {
            const msg = 'Enter a valid non-negative daily rate';
            setError(msg); toast.error(msg); return;
        }
        const ok = await onSetRate(invoice._id, { dailyRate: raw, reason: rateReason.trim() || undefined });
        if (ok) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay" onClick={onClose}>
            <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-border bg-muted dark:bg-muted/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm bg-gradient-to-br from-rose-500 to-red-600 dark:from-rose-400 dark:to-red-500 shadow-rose-600/20">
                            <AlertTriangle size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-foreground">Overdue Penalty Controls</h3>
                            <p className="text-xs font-medium text-muted-foreground">
                                {invoice.user?.name ?? 'Member'} — {invoice.monthName}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Breakdown (read-only for members; admin sees it here too) */}
                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Days Overdue', value: `${days}`, hint: `Due ${istDue}` },
                            { label: 'Daily Rate', value: `₹ ${fmt(rate)}`, hint: 'flat / day (IST)' },
                            { label: 'Accrued', value: `₹ ${fmt(accrued)}`, color: 'text-danger-text' },
                            { label: 'Waived', value: `₹ ${fmt(waived)}`, color: 'text-success-text', hint: 'reversible' },
                        ].map(({ label, value, color, hint }) => (
                            <div key={label} className="bg-muted dark:bg-muted/60 rounded-2xl px-3 py-3">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                                <p className={cn('text-sm font-black tabular-nums', color ?? 'text-foreground')}>{value}</p>
                                {hint && <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{hint}</p>}
                            </div>
                        ))}
                    </div>
                    <div className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-2xl border',
                        net > 0 ? 'bg-danger-bg border-danger-border' : 'bg-success-bg border-success-border'
                    )}>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            Net Penalty Due
                        </span>
                        <span className={cn('text-base font-black tabular-nums', net > 0 ? 'text-danger-text' : 'text-success-text')}>
                            ₹ {fmt(net)}
                        </span>
                    </div>

                    {accrued === 0 && (
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                            <AlertTriangle size={11} /> Not overdue yet (or rate is ₹0) — nothing to waive.
                        </p>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <p className="text-xs font-semibold">{error}</p>
                        </div>
                    )}

                    {/* ── Waive / Unwaive ── */}
                    <form onSubmit={handleWaive} className="space-y-3 pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1.5">
                            Waiver (admin only)
                        </p>
                        {remaining > 0 && (
                            <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                                    Waiver Amount (max ₹ {fmt(remaining)})
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-4 flex items-center text-sm font-bold text-muted-foreground">₹</span>
                                    <input
                                        type="number" step="0.01" min="0" max={remaining}
                                        value={waiveAmount}
                                        onChange={e => setWaiveAmount(e.target.value)}
                                        className="w-full py-3 pl-8 pr-4 rounded-2xl text-base font-bold bg-input border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                                Reason {waived > 0 && '(also required to reverse)'}
                            </label>
                            <textarea
                                rows={2}
                                value={waiveReason}
                                onChange={e => setWaiveReason(e.target.value)}
                                placeholder="Mandatory — recorded in the penalty audit log"
                                className="w-full py-2.5 px-4 rounded-2xl text-sm font-semibold bg-input border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            {waived > 0 && (
                                <Button type="button" variant="secondary" onClick={handleUnwaive} disabled={isSaving} className="flex-1">
                                    <RotateCcw size={15} />
                                    {isSaving ? 'Reversing…' : 'Reverse Waiver'}
                                </Button>
                            )}
                            <Button type="submit" variant="warning" disabled={isSaving || remaining <= 0} className="flex-1">
                                <HandCoins size={15} />
                                {isSaving ? 'Saving…' : `Waive ₹ ${fmt(remaining)}`}
                            </Button>
                        </div>
                    </form>

                    {/* ── Per-bill rate override ── */}
                    <form onSubmit={handleSetRate} className="space-y-3 pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1.5">
                            Rate override (this bill only)
                        </p>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                                    Daily Rate (₹)
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-4 flex items-center text-sm font-bold text-muted-foreground">₹</span>
                                    <input
                                        type="number" step="0.01" min="0"
                                        value={newRate}
                                        onChange={e => setNewRate(e.target.value)}
                                        className="w-full py-3 pl-8 pr-4 rounded-2xl text-base font-bold bg-input border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
                                    />
                                </div>
                            </div>
                            <Button type="submit" variant="neutral" disabled={isRateSaving} className="shrink-0">
                                <Gauge size={15} />
                                {isRateSaving ? 'Saving…' : 'Override'}
                            </Button>
                        </div>
                        <input
                            type="text"
                            value={rateReason}
                            onChange={e => setRateReason(e.target.value)}
                            placeholder="Reason (optional, audited)"
                            className="w-full py-2.5 px-4 rounded-2xl text-sm font-semibold bg-input border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
                        />
                    </form>

                    <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={isSaving || isRateSaving}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
});
PenaltyControlsModal.displayName = 'PenaltyControlsModal';

export default PenaltyControlsModal;
