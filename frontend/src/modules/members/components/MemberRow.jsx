import React, { useState, useCallback, useMemo } from 'react';
import { ChevronDown, UserX, ShieldCheck, Clock, XCircle } from 'lucide-react';
import { Avatar } from '@/shared/components/ui';
import MemberInvoiceDetails from './MemberInvoiceDetails';

/* ─────────────────────────────────────────────
   StatusBadge — pill indicator
───────────────────────────────────────────── */
const STATUS_MAP = {
    success: { bg: 'bg-success-bg', text: 'text-success', border: 'border-success-border', icon: ShieldCheck },
    approved: { bg: 'bg-success-bg', text: 'text-success', border: 'border-success-border', icon: ShieldCheck },
    paid: { bg: 'bg-success-bg', text: 'text-success', border: 'border-success-border', icon: ShieldCheck },
    failed: { bg: 'bg-danger-bg', text: 'text-danger', border: 'border-danger-border', icon: XCircle },
    denied: { bg: 'bg-danger-bg', text: 'text-danger', border: 'border-danger-border', icon: XCircle },
    pending: { bg: 'bg-warning-bg', text: 'text-warning', border: 'border-warning-border', icon: Clock },
};

const DEFAULT_STATUS = { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', icon: null };

export const StatusBadge = React.memo(({ status }) => {
    const key = (status || 'pending').toLowerCase();
    const style = STATUS_MAP[key] ?? DEFAULT_STATUS;
    const Icon = style.icon;

    return (
        <span
            className={[
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                'text-[10.5px] font-bold uppercase tracking-[0.06em]',
                'border select-none',
                style.bg, style.text, style.border,
            ].join(' ')}
        >
            {Icon && <Icon size={12} strokeWidth={2.5} className="shrink-0" />}
            {key}
        </span>
    );
});
StatusBadge.displayName = 'StatusBadge';

/* ─────────────────────────────────────────────
   ExpandButton — desktop right column
───────────────────────────────────────────── */
const ExpandButton = React.memo(({ isExpanded }) => (
    <div
        className={[
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
            isExpanded
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground group-hover:bg-muted group-hover:text-foreground',
        ].join(' ')}
    >
        <ChevronDown
            size={16}
            strokeWidth={2.5}
            className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
        />
    </div>
));
ExpandButton.displayName = 'ExpandButton';

/* ─────────────────────────────────────────────
   Mobile label — appears above each value on sm
───────────────────────────────────────────── */
const MobileLabel = React.memo(({ children }) => (
    <span className="md:hidden text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {children}
    </span>
));
MobileLabel.displayName = 'MobileLabel';

/* ─────────────────────────────────────────────
   MemberRow
───────────────────────────────────────────── */
const MemberRow = React.memo(({ user, index, isLast }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggle = useCallback(() => setIsExpanded((v) => !v), []);

    const rowBase = useMemo(() => [
        'group w-full relative cursor-pointer',
        'transition-colors duration-150',
        'md:grid md:grid-cols-12 md:gap-4 md:items-center md:px-8 md:py-5',
        'flex flex-col gap-3.5 p-5',
        'border border-border md:border-x-0 md:border-t-0',
        'rounded-2xl md:rounded-none',
        isExpanded
            ? 'bg-muted/50 md:bg-muted/30 z-20 rounded-b-none border-b-0 md:border-b'
            : 'bg-card shadow-sm md:shadow-none md:hover:bg-muted/40',
        index === 0 ? 'md:border-t-0' : '',
        isLast && !isExpanded ? 'md:border-b-0' : '',
    ].join(' '), [isExpanded, index, isLast]);

    const formattedMarketAmount = useMemo(() => (user.totalMarketAmount ?? 0).toLocaleString('en-IN'), [user.totalMarketAmount]);

    return (
        <div className="flex flex-col w-full">

            {/* ── Main clickable row ── */}
            <div
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={toggle}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle()}
                className={rowBase}
            >

                {/* 1 ── Profile (col-span-4) ── */}
                <div className="md:col-span-4 flex items-center justify-between md:justify-start gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <Avatar
                            src={user.image}
                            alt={user.name ?? 'Member'}
                            name={user.name}
                            className="w-11 h-11 rounded-full ring-2 ring-background shadow-sm shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[14.5px] md:text-[15px] font-bold text-foreground leading-tight truncate">
                                    {user.name ?? 'Unknown Member'}
                                </span>
                                {!user.isActive && (
                                    <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
                                                   text-[10px] font-bold uppercase tracking-widest
                                                   bg-danger-bg
                                                   text-danger
                                                   border border-danger-border"
                                    >
                                        <UserX size={10} strokeWidth={2.5} />
                                        Inactive
                                    </span>
                                )}
                            </div>
                            <span className="text-[12.5px] font-medium text-muted-foreground truncate mt-0.5">
                                {user.email ?? '\u2014'}
                            </span>
                        </div>
                    </div>

                    {/* Mobile chevron */}
                    <div
                        className={[
                            'md:hidden shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200',
                            isExpanded
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground',
                        ].join(' ')}
                    >
                        <ChevronDown
                            size={16}
                            strokeWidth={2.5}
                            className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                    </div>
                </div>

                {/* Mobile divider */}
                <div className="md:hidden h-px w-full bg-border" />

                {/* 2 ── Market Amount (col-span-2) ── */}
                <div className="md:col-span-2 flex items-center justify-between md:block gap-2">
                    <MobileLabel>Market Amount</MobileLabel>
                    <span className="text-[14px] md:text-[15px] font-extrabold text-foreground tabular-nums">
                        ₹&nbsp;{formattedMarketAmount}
                    </span>
                </div>

                {/* 3 ── Gas Bill (col-span-2) ── */}
                <div className="md:col-span-2 flex items-center justify-between md:block gap-2">
                    <MobileLabel>Gas Bill</MobileLabel>
                    <StatusBadge status={user.gasBill} />
                </div>

                {/* 4 ── Payment Status (col-span-3) ── */}
                <div className="md:col-span-3 flex items-center justify-between md:block gap-2">
                    <MobileLabel>Payment Status</MobileLabel>
                    <StatusBadge status={user.payment} />
                </div>

                {/* 5 ── Expand button desktop (col-span-1) ── */}
                <div className="hidden md:col-span-1 md:flex items-center justify-end">
                    <ExpandButton isExpanded={isExpanded} />
                </div>
            </div>

            {/* ── Collapsible invoice panel ── */}
            <div
                className={[
                    'overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    isExpanded ? 'max-h-[2400px] opacity-100' : 'max-h-0 opacity-0',
                ].join(' ')}
                aria-hidden={!isExpanded}
            >
                <div
                    className={[
                        'px-5 pt-4 pb-6 md:px-8 md:py-6',
                        'bg-muted/30',
                        'border border-t-0 border-border',
                        'rounded-b-2xl md:rounded-b-none',
                        isLast ? 'md:rounded-b-[1.5rem]' : '',
                    ].join(' ')}
                >
                    {isExpanded && <MemberInvoiceDetails user={user} />}
                </div>
            </div>
        </div>
    );
});
MemberRow.displayName = 'MemberRow';

export default MemberRow;
// Alamgir Islam