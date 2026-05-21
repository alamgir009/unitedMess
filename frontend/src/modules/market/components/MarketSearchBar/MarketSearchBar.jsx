import React from 'react';
import { HiOutlineCalendarDays } from 'react-icons/hi2';
import { SearchBar } from '@/shared/components/ui';

/**
 * MarketSearchBar
 * Search input + collapsible date-range filter panel.
 * Keeps NO state of its own — everything is lifted to the parent (MarketPage).
 */
const MarketSearchBar = React.memo(({
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
    <SearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        placeholder={isAdmin ? 'Search by name, email, items, description…' : 'Search by items or description…'}
        filteredCount={filteredCount}
        totalCount={totalCount}
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
        hasActive={hasActive}
        onClearFilters={onClearFilters}
    >
        <div className="flex flex-wrap gap-5 items-start">
            {/* Date From */}
            <div className="space-y-2 flex-shrink-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date From</p>
                <div className="relative">
                    <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => onDateFromChange(e.target.value)}
                        className="h-9 pl-9 pr-3 rounded-lg border border-border/40 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                </div>
            </div>

            {/* Date To */}
            <div className="space-y-2 flex-shrink-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date To</p>
                <div className="relative">
                    <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => onDateToChange(e.target.value)}
                        className="h-9 pl-9 pr-3 rounded-lg border border-border/40 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                </div>
            </div>
        </div>
    </SearchBar>
));
MarketSearchBar.displayName = 'MarketSearchBar';

export default MarketSearchBar;
