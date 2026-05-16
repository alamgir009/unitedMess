import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineMagnifyingGlass,
    HiOutlineXMark,
    HiOutlineAdjustmentsHorizontal,
    HiOutlineCalendarDays,
} from 'react-icons/hi2';

/* ─── Filter data ─────────────────────────────────────── */
const STATUS_OPTS = [
    { value: '',           label: 'All' },
    { value: 'pending',    label: 'Pending' },
    { value: 'completed',  label: 'Completed' },
    { value: 'failed',     label: 'Failed' },
    { value: 'refunded',   label: 'Refunded' },
];

const TYPE_OPTS = [
    { value: '',          label: 'All' },
    { value: 'mess_bill', label: 'Mess Bill' },
    { value: 'gas_bill',  label: 'Gas Bill' },
    { value: 'other',     label: 'Other' },
];

const METHOD_OPTS = [
    { value: '',          label: 'All' },
    { value: 'cash',      label: 'Cash' },
    { value: 'online',    label: 'Online' },
    { value: 'razorpay',  label: 'Razorpay' },
];

/* ─── Pill toggle group ────────────────────────────────── */
const PillGroup = ({ label, options, value, onChange }) => (
    <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">
            {label}
        </p>
        <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                            active
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                                : 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-border'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    </div>
);

/* ─── Date field ───────────────────────────────────────── */
const DateField = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">{label}</p>
        <div className="relative">
            <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 pl-8 pr-3 rounded-xl border border-border/50 bg-muted/30 text-xs text-foreground
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition-all"
            />
        </div>
    </div>
);

/**
 * PaymentSearchBar — search + collapsible pill-filter panel.
 */
const PaymentSearchBar = ({
    isAdmin,
    searchQuery, onSearchChange,
    dateFrom,    onDateFromChange,
    dateTo,      onDateToChange,
    statusFilter,  onStatusChange,
    typeFilter,    onTypeChange,
    methodFilter,  onMethodChange,
    showFilters,   onToggleFilters,
    filteredCount, totalCount,
    hasActive,     onClearFilters,
}) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl
            border border-black/5 dark:border-white/10 shadow-lg overflow-hidden
            before:absolute before:inset-x-12 before:top-0 before:h-px
            before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/20 before:to-transparent"
    >
        {/* ── Search row ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3.5">

            {/* Search input */}
            <div className="relative flex-1">
                <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    placeholder={isAdmin ? 'Search name, email, month, remarks…' : 'Search month, remarks…'}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 rounded-xl border border-border/40 bg-muted/30
                        text-sm text-foreground placeholder:text-muted-foreground/50
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition-all"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <HiOutlineXMark className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Record count */}
                <span className="text-xs text-muted-foreground font-medium hidden sm:block tabular-nums">
                    {filteredCount} / {totalCount}
                </span>

                {/* Filter toggle */}
                <button
                    onClick={onToggleFilters}
                    aria-label="Toggle filters"
                    aria-expanded={showFilters}
                    className={`relative h-10 px-3.5 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                        showFilters || hasActive
                            ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                            : 'border-border/40 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                    <HiOutlineAdjustmentsHorizontal className="w-4 h-4" />
                    <span>Filters</span>
                    {hasActive && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-card" />
                    )}
                </button>

                {/* Clear active filters */}
                {hasActive && (
                    <button
                        onClick={onClearFilters}
                        aria-label="Clear all filters"
                        className="h-10 px-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400
                            text-xs font-bold hover:bg-rose-500/20 transition-all active:scale-95 flex items-center gap-1"
                    >
                        <HiOutlineXMark className="w-3.5 h-3.5" />
                        Clear
                    </button>
                )}
            </div>
        </div>

        {/* ── Filter panel ── */}
        <AnimatePresence>
            {showFilters && (
                <motion.div
                    key="filters"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                >
                    <div className="px-3.5 pb-4 pt-1 border-t border-black/5 dark:border-white/8">
                        <div className="flex flex-wrap gap-x-6 gap-y-4 mt-3">
                            <PillGroup label="Status" options={STATUS_OPTS} value={statusFilter} onChange={onStatusChange} />
                            <PillGroup label="Type"   options={TYPE_OPTS}   value={typeFilter}   onChange={onTypeChange} />
                            <PillGroup label="Method" options={METHOD_OPTS} value={methodFilter} onChange={onMethodChange} />

                            {/* Date range */}
                            <div className="flex flex-wrap gap-3">
                                <DateField label="From" value={dateFrom} onChange={onDateFromChange} />
                                <DateField label="To"   value={dateTo}   onChange={onDateToChange}   />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
);

export default PaymentSearchBar;
