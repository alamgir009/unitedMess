import React from 'react';
import MemberRow from './MemberRow';
import { Loader } from '@/shared/components/ui';
import { Users } from 'lucide-react';

/* ─────────────────────────────────────────────
   Column definitions — single source of truth
   Drives both the sticky header & row cells
───────────────────────────────────────────── */
export const COLUMNS = [
    { id: 'profile',  label: 'Member Profile',  cols: 'col-span-4', align: 'justify-start' },
    { id: 'market',   label: 'Market Amount',   cols: 'col-span-2', align: 'justify-start' },
    { id: 'gas',      label: 'Gas Bill',        cols: 'col-span-2', align: 'justify-start' },
    { id: 'payment',  label: 'Payment Status',  cols: 'col-span-3', align: 'justify-start' },
    { id: 'expand',   label: '',                cols: 'col-span-1', align: 'justify-end'   },
];

/* ─────────────────────────────────────────────
   Empty state
───────────────────────────────────────────── */
const EmptyState = () => (
    <div
        className="flex flex-col items-center justify-center py-28 px-6
                   bg-white dark:bg-slate-900
                   rounded-3xl border border-slate-200 dark:border-slate-800
                   shadow-sm text-center"
    >
        {/* Icon ring */}
        <div
            className="mb-6 w-20 h-20 rounded-full flex items-center justify-center
                       bg-slate-50 dark:bg-slate-800
                       ring-8 ring-slate-50 dark:ring-slate-800/30"
        >
            <Users
                size={32}
                strokeWidth={1.25}
                className="text-slate-300 dark:text-slate-600"
            />
        </div>

        <p className="text-base font-bold text-slate-700 dark:text-slate-300 tracking-tight mb-1">
            No members found
        </p>
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500 max-w-xs">
            Wait for users to register or ensure the database is connected.
        </p>
    </div>
);

/* ─────────────────────────────────────────────
   Loading skeleton — matches table layout
───────────────────────────────────────────── */
const SkeletonRow = () => (
    <div
        className="grid grid-cols-12 gap-4 items-center px-8 py-5
                   border-b border-slate-100 dark:border-slate-800/60
                   animate-pulse"
    >
        {/* Avatar + text */}
        <div className="col-span-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
                <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded-full" />
                <div className="h-2.5 w-40 bg-slate-100 dark:bg-slate-800 rounded-full" />
            </div>
        </div>
        <div className="col-span-2 h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
        <div className="col-span-2 h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
        <div className="col-span-3 h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
        <div className="col-span-1 flex justify-end">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
    </div>
);

/* ─────────────────────────────────────────────
   MemberTable
───────────────────────────────────────────── */
const MemberTable = ({ users, isLoading }) => {
    const membersList = Array.isArray(users) ? users : [];

    /* Loading state — skeleton rows */
    if (isLoading) {
        return (
            <div
                className="w-full bg-white dark:bg-slate-900
                           rounded-3xl border border-slate-200 dark:border-slate-800
                           shadow-sm overflow-hidden"
            >
                {/* Header */}
                <div
                    className="hidden md:grid grid-cols-12 gap-4 items-center px-8 py-4
                               border-b border-slate-200 dark:border-slate-800
                               bg-slate-50/80 dark:bg-slate-800/40"
                >
                    {COLUMNS.map((col) => (
                        col.label ? (
                            <div
                                key={col.id}
                                className={`${col.cols} flex items-center ${col.align}
                                           text-[10.5px] font-bold uppercase tracking-[0.08em]
                                           text-slate-400 dark:text-slate-500`}
                            >
                                {col.label}
                            </div>
                        ) : (
                            <div key={col.id} className={col.cols} />
                        )
                    ))}
                </div>
                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
        );
    }

    /* Empty state */
    if (membersList.length === 0) return <EmptyState />;

    /* Populated table */
    return (
        <div className="w-full">
            {/*
             * Outer shell — rounded card wrapping header + body
             * The border/bg is on the shell so the sticky header
             * doesn't create a double-border at top.
             */}
            <div
                className="w-full bg-white dark:bg-slate-900
                           rounded-3xl border border-slate-200 dark:border-slate-800
                           shadow-sm overflow-hidden"
            >
                {/* ── Sticky desktop column header ── */}
                <div
                    className="hidden md:grid grid-cols-12 gap-4 items-center
                               px-8 py-4 sticky top-0 z-30
                               bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg
                               border-b border-slate-200 dark:border-slate-800"
                >
                    {COLUMNS.map((col) => (
                        <div
                            key={col.id}
                            className={`${col.cols} flex items-center ${col.align}
                                       text-[10.5px] font-bold uppercase tracking-[0.08em]
                                       text-slate-400 dark:text-slate-500 select-none`}
                        >
                            {col.label}
                        </div>
                    ))}
                </div>

                {/* ── Row list ── */}
                <div className="flex flex-col">
                    {membersList.map((user, index) => (
                        <MemberRow
                            key={user?._id ?? user?.id ?? index}
                            user={user}
                            index={index}
                            isLast={index === membersList.length - 1}
                        />
                    ))}
                </div>
            </div>

            {/* ── Footer count ── */}
            <p className="mt-3 text-center text-[11px] font-medium text-slate-400 dark:text-slate-600 select-none">
                Showing {membersList.length} member{membersList.length !== 1 ? 's' : ''}
            </p>
        </div>
    );
};

export default React.memo(MemberTable);