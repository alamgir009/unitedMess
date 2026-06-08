import { useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  <div className="group relative flex flex-col rounded-lg border border-border bg-card shadow-sm overflow-hidden transition-shadow duration-150">
    <div className="flex flex-row items-center gap-2 p-2.5">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={placeholder}
          className="w-full h-10 pl-10 pr-10 rounded-lg border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none searchbar-kbd">
          <kbd className="text-[11px] font-sans text-muted-foreground bg-muted border border-border rounded-xs px-1.5 py-0.5 leading-none">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </div>
      </div>

      <div className="flex flex-row items-center gap-2 flex-shrink-0">
        {(totalCount > 0 || filteredCount > 0) && (
          <span className="text-xs text-muted-foreground font-medium hidden sm:block tabular-nums">
            {filteredCount} / {totalCount}
          </span>
        )}

        <button
          onClick={onToggleFilters}
          aria-label="Toggle filters"
          aria-expanded={showFilters}
          className={`touch-target relative h-10 px-3.5 rounded-lg border text-sm font-semibold flex items-center gap-1.5 transition-all duration-150 ${
            showFilters || hasActive
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActive && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
          )}
        </button>

        {hasActive && (
          <button
            onClick={onClearFilters}
            aria-label="Clear all filters"
            className="touch-target h-10 px-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-all flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </div>

    <AnimatePresence initial={false}>
      {showFilters && (
        <motion.div
          key="filter-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="p-3 border-t border-border">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default SearchBar;
