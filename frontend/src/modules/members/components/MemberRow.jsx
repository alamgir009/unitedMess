import React, { useState, useCallback } from 'react';
import { ChevronDown, UserX } from 'lucide-react';
import { Avatar } from '@/shared/components/ui';
import MemberInvoiceDetails from './MemberInvoiceDetails';

/* ─────────────────────────────────────────────
   StatusBadge — pill indicator
───────────────────────────────────────────── */
const STATUS_MAP = {
    success: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/25', dot: 'bg-emerald-500' },
    approved: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/25', dot: 'bg-emerald-500' },
    paid: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/25', dot: 'bg-emerald-500' },
    failed: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/25', dot: 'bg-rose-500' },
    denied: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/25', dot: 'bg-rose-500' },
    pending: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/25', dot: 'bg-amber-400' },
};

const DEFAULT_STATUS = { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' };

export const StatusBadge = ({ status }) => {
    const key = (status || 'pending').toLowerCase();
    const style = STATUS_MAP[key] ?? DEFAULT_STATUS;

    return (
        <span
            className={[
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                'text-[10.5px] font-bold uppercase tracking-[0.06em]',
                'border select-none',
                style.bg, style.text, style.border,
            ].join(' ')}
        >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
            {key}
        </span>
    );
};

/* ─────────────────────────────────────────────
   ExpandButton — desktop right column
───────────────────────────────────────────── */
const ExpandButton = ({ isExpanded }) => (
    <div
        className={[
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
            isExpanded
                ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                : 'text-slate-400 dark:text-slate-500 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 group-hover:text-slate-600 dark:group-hover:text-slate-300',
        ].join(' ')}
    >
        <ChevronDown
            size={16}
            strokeWidth={2.5}
            className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
        />
    </div>
);

/* ─────────────────────────────────────────────
   Mobile label — appears above each value on sm
───────────────────────────────────────────── */
const MobileLabel = ({ children }) => (
    <span className="md:hidden text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        {children}
    </span>
);

/* ─────────────────────────────────────────────
   MemberRow
───────────────────────────────────────────── */
const MemberRow = ({ user, index, isLast }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggle = useCallback(() => setIsExpanded((v) => !v), []);

    /* Row variants */
    const rowBase = [
        'group w-full relative cursor-pointer',
        'transition-colors duration-150',
        // Desktop layout
        'md:grid md:grid-cols-12 md:gap-4 md:items-center md:px-8 md:py-5',
        // Mobile layout
        'flex flex-col gap-3.5 p-5',
        // Mobile card border
        'border border-slate-200 dark:border-slate-800 md:border-x-0 md:border-t-0',
        'rounded-2xl md:rounded-none',
        // States
        isExpanded
            ? 'bg-slate-50 dark:bg-slate-800/50 md:bg-slate-50/70 md:dark:bg-slate-800/30 z-20'
            : 'bg-white dark:bg-slate-900 md:hover:bg-slate-50/80 md:dark:hover:bg-slate-800/40',
        // First row — no top border
        index === 0 ? 'md:border-t-0' : '',
        // Last row — round bottom corners and remove bottom border if not expanded
        isLast && !isExpanded ? 'md:border-b-0' : '',
    ].join(' ');

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
                            fallback={(user.name?.charAt(0) ?? 'U').toUpperCase()}
                            className="w-11 h-11 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm shrink-0 object-cover"
                        />
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[14.5px] md:text-[15px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                                    {user.name ?? 'Unknown Member'}
                                </span>
                                {!user.isActive && (
                                    <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
                                                   text-[10px] font-bold uppercase tracking-widest
                                                   bg-rose-50 dark:bg-rose-500/15
                                                   text-rose-600 dark:text-rose-400
                                                   border border-rose-200 dark:border-rose-500/30"
                                    >
                                        <UserX size={10} strokeWidth={2.5} />
                                        Inactive
                                    </span>
                                )}
                            </div>
                            <span className="text-[12.5px] font-medium text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                {user.email ?? '—'}
                            </span>
                        </div>
                    </div>

                    {/* Mobile chevron */}
                    <div
                        className={[
                            'md:hidden shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200',
                            isExpanded
                                ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-500'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400',
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
                <div className="md:hidden h-px w-full bg-slate-100 dark:bg-slate-800/70" />

                {/* 2 ── Market Amount (col-span-2) ── */}
                <div className="md:col-span-2 flex items-center justify-between md:block gap-2">
                    <MobileLabel>Market Amount</MobileLabel>
                    <span className="text-[14px] md:text-[15px] font-extrabold text-slate-700 dark:text-slate-200 tabular-nums">
                        ₹&nbsp;{(user.totalMarketAmount ?? 0).toLocaleString('en-IN')}
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
                        'px-4 pt-4 pb-6 md:px-8 md:py-6',
                        'bg-slate-50/60 dark:bg-slate-800/25',
                        'border-x border-b border-slate-200 dark:border-slate-800',
                        'rounded-b-2xl md:rounded-b-none',
                        isLast ? 'md:rounded-b-[1.5rem]' : '',
                        // Mobile: attach below the card without gap
                        '-mt-2 md:mt-0 pt-[calc(0.75rem+2px)] md:pt-6',
                    ].join(' ')}
                >
                    {isExpanded && <MemberInvoiceDetails user={user} />}
                </div>
            </div>
        </div>
    );
};

export default React.memo(MemberRow);