import { motion } from 'framer-motion';
import {
    HiOutlineMagnifyingGlass,
    HiOutlineXMark,
    HiOutlineAdjustmentsHorizontal,
} from 'react-icons/hi2';

/**
 * Reusable, compact SearchBar component for Market, Payment, and Meal modules.
 * Uses CSS grid collapse (zero JS animation) for ultra-smooth toggle on low-end devices.
 * Clean border style matching Market Scheduler premium aesthetic.
 */
const SearchBar = ({
    searchQuery,
    onSearchChange,
    placeholder = 'Search...',
    filteredCount = 0,
    totalCount = 0,
    showFilters,
    onToggleFilters,
    hasActive,
    onClearFilters,
    children,
}) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="group relative flex flex-col rounded-2xl sm:rounded-[18px]
            border border-border/60 dark:border-white/10
            bg-card dark:bg-card
            shadow-sm md:shadow-lg
            overflow-hidden
            transition-shadow duration-300"
    >
        {/* ── Top bar ── */}
        <div className="flex flex-row items-center gap-2 p-3">

            {/* Search input */}
            <div className="relative flex-1">
                <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 rounded-xl border border-border/40 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        aria-label="Clear search"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full"
                    >
                        <HiOutlineXMark className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Right controls */}
            <div className="flex flex-row items-center gap-2 flex-shrink-0">
                {(totalCount > 0 || filteredCount > 0) && (
                    <span className="text-xs text-muted-foreground font-medium hidden sm:block tabular-nums">
                        {filteredCount} / {totalCount}
                    </span>
                )}

                <button
                    onClick={onToggleFilters}
                    aria-label="Toggle filters"
                    className={`relative h-10 px-3.5 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                        showFilters || hasActive
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border/40 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                    <HiOutlineAdjustmentsHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                    {hasActive && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
                    )}
                </button>

                {hasActive && (
                    <button
                        onClick={onClearFilters}
                        aria-label="Clear all filters"
                        className="h-10 px-3 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-all active:scale-95 flex items-center gap-1"
                    >
                        <HiOutlineXMark className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Clear</span>
                    </button>
                )}
            </div>
        </div>

        {/* ── Collapsible filter panel — CSS grid collapse (zero JS, GPU-friendly) ── */}
        <div
            className="grid transition-all duration-300 ease-out will-change-[grid-template-rows]"
            style={{
                gridTemplateRows: showFilters ? '1fr' : '0fr',
                transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
            }}
        >
            <div className="overflow-hidden">
                <div
                    className={`p-4 border-t border-border/60 dark:border-white/10 transition-all duration-300 ease-out ${
                        showFilters
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 -translate-y-1'
                    }`}
                >
                    {children}
                </div>
            </div>
        </div>
    </motion.div>
);

export default SearchBar;

