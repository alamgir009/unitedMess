import { memo, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
} from 'date-fns';
import CalendarCell from './CalendarCell';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarGrid = memo(({
  currentMonth,
  dataMap = {},
  category,
  loadingMap = {},
  errorMap = {},
  onCellClick,
  onRetry,
  onPrevMonth,
  onNextMonth,
  showMealCount = true,
  scheduleMap = {},
  ownDutyMap = {},
}) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const totalRows = Math.ceil(days.length / 7);
  const lastRowIndex = totalRows - 1;

  return (
    <div>
      {/* Month navigation bar */}
      <div
        className="flex items-center justify-between sm:justify-center gap-0 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3"
        style={{ background: 'var(--calendar-header-bg)' }}
      >
        <button
          onClick={onPrevMonth}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm sm:text-base font-bold tracking-tight select-none whitespace-nowrap">
          <span className="text-[var(--text-primary)]">
            {format(currentMonth, 'MMMM')}
          </span>
          <span className="text-[var(--text-secondary)] font-semibold ml-1.5 tabular-nums">
            {format(currentMonth, 'yyyy')}
          </span>
        </h2>
        <button
          onClick={onNextMonth}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-name header row */}
      <div className="grid grid-cols-7">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="text-center py-2.5 sm:py-3"
            style={{
              background: 'var(--calendar-header-bg)',
              borderBottom: '1px solid var(--calendar-border)',
            }}
          >
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--calendar-header-text)]">
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const weekRow = Math.floor(idx / 7);
          const colIdx = idx % 7;
          const isLastRow = weekRow === lastRowIndex;
          const isFirstInRow = colIdx === 0;
          const isLastInRow = colIdx === 6;

          return (
            <CalendarCell
              key={dateStr}
              date={day}
              data={dataMap[dateStr] || []}
              category={category}
              loading={loadingMap[dateStr]}
              error={errorMap[dateStr]}
              onCellClick={onCellClick}
              onRetry={onRetry}
              dateKey={`${dateStr}-${category}`}
              currentMonth={currentMonth}
              isDesktop={isDesktop}
              isHovered={false}
              showMealCount={showMealCount}
              isLastRow={isLastRow}
              isFirstInRow={isFirstInRow}
              isLastInRow={isLastInRow}
              scheduleData={scheduleMap[dateStr] || null}
              isOwnDuty={!!ownDutyMap[dateStr]}
            />
          );
        })}
      </div>
    </div>
  );
});

CalendarGrid.displayName = 'CalendarGrid';
export default CalendarGrid;
