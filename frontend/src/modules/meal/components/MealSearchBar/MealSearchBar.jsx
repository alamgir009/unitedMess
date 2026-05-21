import React from 'react';
import { HiOutlineCalendarDays } from 'react-icons/hi2';
import { SearchBar } from '@/shared/components/ui';

const TypePill = React.memo(({ label, active, onClick }) => (
    <button
        onClick={onClick}
        type="button"
        aria-pressed={active}
        className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 min-h-[36px] ${active
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'bg-muted/40 text-muted-foreground border border-border/40 hover:bg-muted/70 hover:text-foreground'}`}
    >
        {label}
    </button>
));
TypePill.displayName = 'TypePill';

const MealSearchBar = ({
    isAdmin,
    searchQuery,
    onSearchChange,
    typeFilter,
    onTypeChange,
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
        placeholder={isAdmin ? 'Search by name, email, date, remarks…' : 'Search by date or remarks…'}
        filteredCount={filteredCount}
        totalCount={totalCount}
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
        hasActive={hasActive}
        onClearFilters={onClearFilters}
    >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
            <div className="space-y-2 flex-shrink-0 w-full sm:w-auto">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Meal Type</p>
                <div className="flex gap-1.5 flex-wrap">
                    {['all', 'both', 'day', 'night', 'off'].map(t => (
                        <TypePill
                            key={t}
                            label={t.charAt(0).toUpperCase() + t.slice(1)}
                            active={typeFilter === t}
                            onClick={() => onTypeChange(t)}
                        />
                    ))}
                </div>
            </div>

            <div className="flex gap-4 flex-wrap w-full sm:w-auto">
                <div className="space-y-2 flex-shrink-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date From</p>
                    <div className="relative">
                        <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => onDateFromChange(e.target.value)}
                            className="h-9 pl-9 pr-3 rounded-xl border border-border/40 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all w-full"
                        />
                    </div>
                </div>

                <div className="space-y-2 flex-shrink-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date To</p>
                    <div className="relative">
                        <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => onDateToChange(e.target.value)}
                            className="h-9 pl-9 pr-3 rounded-xl border border-border/40 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all w-full"
                        />
                    </div>
                </div>
            </div>
        </div>
    </SearchBar>
);

export default MealSearchBar;
