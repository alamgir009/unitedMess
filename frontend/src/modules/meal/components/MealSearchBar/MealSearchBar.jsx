import React from 'react';
import { HiOutlineCalendarDays } from 'react-icons/hi2';
import { SearchBar } from '@/shared/components/ui';

const TypePill = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        type="button"
        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 active:scale-95 ${active
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
            : 'bg-muted/40 text-muted-foreground border border-border/40 hover:bg-muted/70 hover:text-foreground'}`}
    >
        {label}
    </button>
);

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
        <div className="flex flex-wrap gap-5 items-start">
            <div className="space-y-2 flex-shrink-0">
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
            
            <div className="space-y-2 flex-shrink-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date From</p>
                <div className="relative">
                    <HiOutlineCalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => onDateFromChange(e.target.value)}
                        className="h-9 pl-9 pr-3 rounded-xl border border-border/40 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
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
                        className="h-9 pl-9 pr-3 rounded-xl border border-border/40 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                </div>
            </div>
        </div>
    </SearchBar>
);

export default MealSearchBar;
