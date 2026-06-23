import { memo } from 'react';
import { isToday, isSameMonth, isWeekend } from 'date-fns';
import { cn } from '@/core/utils/helpers/string.helper';
import DateNumber from './cells/DateNumber';
import MealCellContent from './cells/MealCellContent';
import MarketCellContent from './cells/MarketCellContent';
import PaymentCellContent from './cells/PaymentCellContent';

const CELL_CONTENT = {
  meals: MealCellContent,
  markets: MarketCellContent,
  payments: PaymentCellContent,
};

const CATEGORY_KEY = {
  meals: 'meal',
  markets: 'market',
  payments: 'payment',
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

  return (
    <div
      role="gridcell"
      aria-label={`${dayLabel}, ${category}: ${totalEntries} entries`}
      className={cn(
        'relative flex flex-col p-1 sm:p-1.5 lg:p-2.5',
        'min-h-[72px] sm:min-h-[clamp(80px,11vw,110px)] lg:min-h-[clamp(88px,12vw,120px)]',
        'border-b border-r border-[var(--border-default)]',
        'bg-[var(--bg-elevated)]',
        'transition-all duration-120 ease-out',
        'cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        'contain-layout',
        today && 'bg-[var(--accent-primary)]/8 ring-1 sm:ring-2 ring-[var(--accent-primary)]/15 shadow-sm shadow-[var(--accent-primary)]/10 z-[1]',
        today && 'border-t-[3px] border-t-[var(--accent-primary)]',
        !inMonth && 'opacity-40',
        !today && 'hover:bg-[var(--bg-muted)] hover:shadow-xs hover:-translate-y-px',
        '[&:nth-child(7n)]:border-r-0',
        '[&:nth-last-child(-n+7)]:border-b-0',
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
    isSameData(prev.data, next.data)
  );
});
