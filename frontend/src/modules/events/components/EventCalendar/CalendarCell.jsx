import { memo } from 'react';
import { isToday, isSameMonth, isWeekend } from 'date-fns';
import { cn } from '@/core/utils/helpers/string.helper';
import DateNumber from './cells/DateNumber';
import MealCellContent from './cells/MealCellContent';
import MarketCellContent from './cells/MarketCellContent';
import PaymentCellContent from './cells/PaymentCellContent';
import VoteCellContent from './cells/VoteCellContent';

const CELL_CONTENT = {
  meals: MealCellContent,
  markets: MarketCellContent,
  payments: PaymentCellContent,
  votes: VoteCellContent,
};

const CATEGORY_KEY = {
  meals: 'meal',
  markets: 'market',
  payments: 'payment',
  votes: 'vote',
};

const CalendarCell = ({
  date,
  data = [],
  category,
  loading,
  error,
  onCellClick,
  onRetry,
  dateKey,
  currentMonth,
  isDesktop,
  isHovered,
  showMealCount = true,
  isLastRow = false,
  isFirstInRow = false,
  isLastInRow = false,
  scheduleData = null,
  isOwnDuty = false,
}) => {
  const today = isToday(date);
  const inMonth = isSameMonth(date, currentMonth);
  const weekend = isWeekend(date);
  const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const totalEntries = data.length;
  const Content = CELL_CONTENT[category] || (() => null);
  const catKey = CATEGORY_KEY[category] || category;

  const categoryList = new Set();
  if (data.some((e) => e.type || category === 'meals')) categoryList.add('meals');
  if (data.some((e) => e.amount && category === 'markets')) categoryList.add('markets');
  if (data.some((e) => e.status && category === 'payments')) categoryList.add('payments');
  if (data.some((e) => e.eventType || category === 'votes')) categoryList.add('votes');

  return (
    <div
      role="gridcell"
      aria-label={`${dayLabel}, ${category}: ${totalEntries} entries`}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '80px',
        borderBottom: '1px solid var(--calendar-border)',
        borderRight: !isLastInRow ? '1px solid var(--calendar-border)' : 'none',
      }}
      className={cn(
        'relative flex flex-col p-1.5 sm:p-1.5 lg:p-2.5 overflow-hidden',
        'min-h-[80px] sm:min-h-[clamp(84px,11vw,110px)] lg:min-h-[clamp(88px,12vw,120px)]',
        'transition-all duration-150 ease-out',
        'cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]',
        today && 'bg-[var(--calendar-today-bg)] shadow-md shadow-[var(--calendar-today-glow)] z-[1]',
        today && 'border-t-[3px] border-t-[var(--calendar-today-border)]',
        weekend && !today && 'bg-[var(--calendar-weekend-bg)]',
        !weekend && !today && 'bg-[var(--bg-elevated)]',
        !inMonth && 'bg-[var(--calendar-out-of-month-bg)] opacity-40',
        !inMonth && 'hover:opacity-60',
        !today && 'hover:bg-[var(--calendar-cell-hover-bg)] hover:shadow-sm hover:shadow-[var(--calendar-cell-hover-shadow)] hover:-translate-y-px',
        isOwnDuty && category === 'markets' && 'border-l-2 lg:border-l-[3px] border-l-[var(--duty-own)] bg-[var(--duty-own-bg)]',
      )}
      tabIndex={0}
      onClick={() => onCellClick?.(date, data)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCellClick?.(date, data);
        }
      }}
    >
      <DateNumber
        date={date}
        currentMonth={currentMonth}
        totalEntries={totalEntries}
        visibleCategories={Array.from(categoryList)}
        isDesktop={isDesktop}
        isHovered={isHovered}
      />
      <Content
        entries={data}
        loading={loading}
        error={error}
        isCompact={!isDesktop}
        onRetry={onRetry}
        onCellClick={(e) => onCellClick?.(date, data)}
        showMealCount={showMealCount}
        scheduleData={scheduleData}
        isOwnDuty={isOwnDuty}
      />
    </div>
  );
};

CalendarCell.displayName = 'CalendarCell';

const isSameData = (a, b) => {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  return a[0]?._id === b[0]?._id && a[a.length - 1]?._id === b[b.length - 1]?._id;
};

export default memo(CalendarCell, (prev, next) => {
  return (
    prev.dateKey === next.dateKey &&
    prev.category === next.category &&
    prev.loading === next.loading &&
    prev.error === next.error &&
    prev.currentMonth === next.currentMonth &&
    prev.isDesktop === next.isDesktop &&
    prev.isHovered === next.isHovered &&
    prev.showMealCount === next.showMealCount &&
    prev.isLastRow === next.isLastRow &&
    prev.isFirstInRow === next.isFirstInRow &&
    prev.isLastInRow === next.isLastInRow &&
    prev.scheduleData === next.scheduleData &&
    prev.isOwnDuty === next.isOwnDuty &&
    prev.onCellClick === next.onCellClick &&
    prev.onRetry === next.onRetry &&
    isSameData(prev.data, next.data)
  );
});
