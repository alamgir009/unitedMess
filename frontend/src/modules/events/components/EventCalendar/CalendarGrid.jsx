import { memo, useMemo } from 'react';
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
  showMealCount = true,
}) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  return (
    <div className="bg-[var(--bg-elevated)] overflow-hidden">
      <div className="grid grid-cols-7 gap-px bg-[var(--border-strong)]">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] py-2 sm:py-2.5 bg-[var(--bg-muted)]"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-[var(--border-strong)]">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');

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
            />
          );
        })}
      </div>
    </div>
  );
});

CalendarGrid.displayName = 'CalendarGrid';
export default CalendarGrid;
