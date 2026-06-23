import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/core/utils/helpers/string.helper';

const CalendarHeader = ({ currentMonth, onPrevMonth, onNextMonth, onToday }) => {
  return (
    <div className="flex items-center justify-between mb-3 sm:mb-5">
      <h2 className="text-lg sm:text-xl font-bold tracking-tight">
        <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
          {format(currentMonth, 'MMMM')}
        </span>
        <span className="text-muted-foreground font-semibold ml-1.5 sm:ml-2 tabular-nums">{format(currentMonth, 'yyyy')}</span>
      </h2>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onToday}
          className="px-2.5 sm:px-3.5 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg text-primary bg-primary/10 hover:bg-primary/15 active:bg-primary/20 shadow-sm shadow-primary/5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Go to today"
        >
          <span className="sm:hidden">Now</span>
          <span className="hidden sm:inline">Today</span>
        </button>
        <div className="flex items-center surface-elevated border border-border/60 rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={onPrevMonth}
            className="p-1 sm:p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/70 transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <div className="w-px h-3 sm:h-4 bg-border/60" aria-hidden="true" />
          <button
            onClick={onNextMonth}
            className="p-1 sm:p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/70 transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            aria-label="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

CalendarHeader.displayName = 'CalendarHeader';
export default CalendarHeader;
