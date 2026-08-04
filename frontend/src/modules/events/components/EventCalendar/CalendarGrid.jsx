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

  const totalRows = Math.ceil(days.length / 7);
  const lastRowIndex = totalRows - 1;

  return (
    <div>
      {/* Header row */}
      <div className="grid grid-cols-7">
        {DAY_HEADERS.map((day, idx) => (
          <div
            key={day}
            className={`
              text-center py-2.5 sm:py-3
              ${idx === 0 ? 'rounded-tl-xl' : ''}
              ${idx === 6 ? 'rounded-tr-xl' : ''}
            `}
            style={{
              background: (day === 'Sun' || day === 'Sat')
                ? 'var(--calendar-header-weekend-bg)'
                : 'var(--calendar-header-bg)',
              borderBottom: '1px solid var(--calendar-border)',
            }}
          >
            <span
              className={`
                text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em]
                ${(day === 'Sun' || day === 'Sat')
                  ? 'text-[var(--calendar-header-weekend-text)]'
                  : 'text-[var(--calendar-header-text)]'
                }
              `}
            >
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
            />
          );
        })}
      </div>
    </div>
  );
});

CalendarGrid.displayName = 'CalendarGrid';
export default CalendarGrid;
