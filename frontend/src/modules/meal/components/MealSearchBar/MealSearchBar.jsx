import React from 'react';
import { HiOutlineCalendarDays } from 'react-icons/hi2';
import { SearchBar, Input } from '@/shared/components/ui';

const TypePill = React.memo(({ label, active, onClick }) => (
    <button
        onClick={onClick}
        type="button"
        aria-pressed={active}
        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 min-h-[40px] ${active
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
                    <Input
                        type="date"
                        size="sm"
                        value={dateFrom}
                        onChange={(e) => onDateFromChange(e.target.value)}
                        leftIcon={<HiOutlineCalendarDays className="w-4 h-4 text-muted-foreground" />}
                        aria-label="Date From"
                    />
                </div>

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
        </div>
    </SearchBar>
);

export default MealSearchBar;
