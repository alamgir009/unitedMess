import { memo } from 'react';
import {
    ShieldCheck,
    Clock,
    XCircle,
    RotateCcw,
    RefreshCw,
    AlertTriangle,
    UserCheck,
    UserMinus,
    Ban,
} from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';

/* ─────────────────────────────────────────────────────────────
   StatusBadge — the single source of truth for status pills.
   Every state maps to a label + glyph + semantic token family,
   so no two meanings share one color and no state bypasses
   themes. Money states (refund) get their own token family so
   they are distinguishable from informational blue.

   Tone contract:
     success  → --success-*   (settled, approved, paid)
     warning  → --warning-*   (awaiting action)
     info     → --info-*      (in-flight, neutral process)
     refund   → --refund-*    (money coming back to a member)
     danger   → --danger-*    (failed, denied, overdue)
     neutral  → muted         (inactive, other)
   ───────────────────────────────────────────────────────────── */

const TONES = {
    success: 'bg-success-bg text-success-text ring-1 ring-success-border',
    warning: 'bg-warning-bg text-warning-text ring-1 ring-warning-border',
    info:    'bg-info-bg text-info-text ring-1 ring-info-border',
    refund:  'bg-refund-bg text-refund-text ring-1 ring-refund-border',
    danger:  'bg-danger-bg text-danger-text ring-1 ring-danger-border',
    neutral: 'bg-muted/60 text-muted-foreground ring-1 ring-border/40',
};

const STATUS_MAP = {
    // payment / bill lifecycle
    paid:                 { label: 'Paid',      tone: 'success', icon: ShieldCheck },
    completed:            { label: 'Paid',      tone: 'success', icon: ShieldCheck },
    success:              { label: 'Success',   tone: 'success', icon: ShieldCheck },
    approved:             { label: 'Approved',  tone: 'success', icon: ShieldCheck },
    verified:             { label: 'Verified',  tone: 'success', icon: ShieldCheck },
    pending:              { label: 'Pending',   tone: 'warning', icon: Clock },
    partially_paid:       { label: 'Partial',   tone: 'warning', icon: Clock },
    unpaid:               { label: 'Unpaid',    tone: 'danger',  icon: Ban },
    overdue:              { label: 'Overdue',   tone: 'danger',  icon: AlertTriangle },
    failed:               { label: 'Failed',    tone: 'danger',  icon: XCircle },
    denied:               { label: 'Denied',    tone: 'danger',  icon: XCircle },
    pending_verification: { label: 'Verifying', tone: 'info',    icon: RefreshCw },
    refund:               { label: 'Refund Due', tone: 'refund', icon: RotateCcw },
    refunded:             { label: 'Refunded',  tone: 'refund',  icon: RotateCcw },
    // member account lifecycle
    active:               { label: 'Active',    tone: 'success', icon: UserCheck },
    inactive:             { label: 'Inactive',  tone: 'neutral', icon: UserMinus },
};

const DEFAULT_STATUS = { label: null, tone: 'neutral', icon: null };

export const StatusBadge = memo(({ status, label, className }) => {
    const key = String(status || '').toLowerCase().replace(/\s+/g, '_');
    const cfg = STATUS_MAP[key] ?? { ...DEFAULT_STATUS, label: label ?? status };
    const Icon = cfg.icon;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                'text-[10px] font-bold uppercase tracking-wider leading-none select-none',
                'ring-1',
                TONES[cfg.tone],
                className,
            )}
        >
            {Icon && <Icon size={12} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />}
            <span>{label ?? cfg.label ?? key}</span>
        </span>
    );
});

StatusBadge.displayName = 'StatusBadge';
export default StatusBadge;
