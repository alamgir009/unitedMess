import React from 'react';
import { HiOutlineCalendarDays } from 'react-icons/hi2';
import { SearchBar, Input } from '@/shared/components/ui';

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
                <Input
                    type="date"
                    size="sm"
                    value={dateFrom}
                    onChange={(e) => onDateFromChange(e.target.value)}
                    leftIcon={<HiOutlineCalendarDays className="w-4 h-4 text-muted-foreground" />}
                    aria-label="Date From"
                />
            </div>

            {/* Date To */}
            <div className="space-y-2 flex-shrink-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date To</p>
                <Input
                    type="date"
                    size="sm"
                    value={dateTo}
                    onChange={(e) => onDateToChange(e.target.value)}
                    leftIcon={<HiOutlineCalendarDays className="w-4 h-4 text-muted-foreground" />}
                    aria-label="Date To"
                />
            </div>
        </div>
    </SearchBar>
));
MarketSearchBar.displayName = 'MarketSearchBar';

export default MarketSearchBar;
