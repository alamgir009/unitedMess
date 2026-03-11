import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineMagnifyingGlass,
    HiOutlineXMark,
    HiOutlineAdjustmentsHorizontal,
    HiOutlineCalendarDays,
} from 'react-icons/hi2';

/**
 * MarketSearchBar
 * Search input + collapsible date-range filter panel + record count badge.
 * Keeps NO state of its own — everything is lifted to the parent (MarketPage).
 */
const MarketSearchBar = ({
    isAdmin,
    searchQuery,
    onSearchChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    showFilters,
    onToggleFilters,
    filteredCount,
    totalCount,
    hasActive,
    onClearFilters,
}) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="group relative flex flex-col rounded-[18px] bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden shadow-lg hover:shadow-xl dark:shadow-black/40 transition-all duration-300 hover:-translate-y-1
            before:absolute before:inset-x-12 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/20 before:to-transparent
            after:absolute after:inset-x-12 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-black/20 dark:after:via-black/60 after:to-transparent"
    >
        {/* ── Top bar ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4">

            {/* Search input */}
            <div className="relative flex-1">
                <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    placeholder={isAdmin ? 'Search by name, email, items, description…' : 'Search by items or description…'}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 rounded-2xl border border-white/10 dark:border-white/5 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        aria-label="Clear search"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <HiOutlineXMark className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Record count */}
                <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                    {filteredCount} of {totalCount} record{totalCount !== 1 ? 's' : ''}
                </span>

                {/* Filter toggle button */}
                <button
                    onClick={onToggleFilters}
                    aria-label="Toggle filters"
                    className={`relative h-10 px-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 transition-all ${
                        showFilters || hasActive
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'border-white/10 dark:border-white/5 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                    <HiOutlineAdjustmentsHorizontal className="w-4 h-4" />
                    <span>Filters</span>
                    {hasActive && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                    )}
                </button>

                {/* Clear button — only when active */}
                {hasActive && (
                    <button
                        onClick={onClearFilters}
                        aria-label="Clear all filters"
                        className="h-10 px-3 rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-all active:scale-95 flex items-center gap-1"
                    >
                        <HiOutlineXMark className="w-3.5 h-3.5" />
                        Clear
                    </button>
                )}
            </div>
        </div>

        {/* ── Collapsible date-range filter panel ── */}
        <AnimatePresence>
            {showFilters && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-white/10 dark:border-white/5"
                >
                    <div className="p-4 flex flex-wrap gap-5 items-start">

                        {/* Date From */}
                        <div className="space-y-2 flex-shrink-0">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Date From</p>
                            <div className="relative">
                                <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => onDateFromChange(e.target.value)}
                                    className="h-9 pl-9 pr-3 rounded-xl border border-white/10 dark:border-white/5 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                                />
                            </div>
                        </div>

                        {/* Date To */}
                        <div className="space-y-2 flex-shrink-0">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Date To</p>
                            <div className="relative">
                                <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => onDateToChange(e.target.value)}
                                    className="h-9 pl-9 pr-3 rounded-xl border border-white/10 dark:border-white/5 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                                />
                            </div>
                        </div>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
);

export default MarketSearchBar;
