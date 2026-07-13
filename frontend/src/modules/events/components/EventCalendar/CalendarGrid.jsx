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
    <div className="rounded-xl border border-border/80 shadow-sm bg-[var(--bg-elevated)] overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-[var(--border-default)] border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] py-2 sm:py-2.5"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const monthIdx = day.getMonth();
          const isOutsideMonth = monthIdx !== currentMonth.getMonth();

          return (
            <div
              key={dateStr}
              className={isOutsideMonth ? 'opacity-40' : ''}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '72px' }}
            >
              <CalendarCell
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
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

CalendarGrid.displayName = 'CalendarGrid';
export default CalendarGrid;
