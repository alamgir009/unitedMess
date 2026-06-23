import { memo, useMemo } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';
import { isToday, isWeekend, isSameMonth } from 'date-fns';

const DayDot = memo(({ categories }) => {
  const maxDots = categories.slice(0, 3);
  return (
    <span className="inline-flex items-center gap-0.5 mt-px" aria-hidden="true">
      {maxDots.map((cat, i) => (
        <span
          key={i}
          className={cn(
            'w-1 h-1 rounded-full',
            cat === 'meals' && 'bg-[var(--slot-day)]',
            cat === 'markets' && 'bg-[var(--market-accent)]',
            cat === 'payments' && 'bg-[var(--payment-paid)]',
          )}
        />
      ))}
    </span>
  );
});
DayDot.displayName = 'DayDot';

const EntryCountBadge = memo(({ count, isHovered }) => {
  if (count <= 0 || isHovered) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-4 px-1 rounded-full',
        'text-[10px] font-medium leading-none',
        'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]',
        'shadow-xs',
      )}
      aria-label={`${count} entries`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
});
EntryCountBadge.displayName = 'EntryCountBadge';

const DateNumber = memo(({
  date,
  currentMonth,
  totalEntries = 0,
  visibleCategories = [],
  isDesktop = false,
  isHovered = false,
}) => {
  const today = isToday(date);
  const weekend = isWeekend(date);
  const inMonth = isSameMonth(date, currentMonth);
  const day = date.getDate();

  return (
    <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
      {today ? (
        <span
          className={cn(
            'inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full',
            'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--brand)] text-white font-bold',
            'text-[10px] sm:text-xs',
            'shadow-sm shadow-[var(--accent-primary)]/25 ring-1 ring-white/20 dark:ring-white/10',
            'tabular-nums leading-none shrink-0',
          )}
          aria-label={`Today, ${day}`}
        >
          {day}
        </span>
      ) : (
        <span
          className={cn(
            'tabular-nums leading-none text-[11px] sm:text-[13px] lg:text-[15px]',
            !inMonth && 'text-[var(--text-muted)] opacity-40',
            inMonth && weekend && 'text-[var(--accent-primary)]/70',
            inMonth && !weekend && 'font-semibold text-[var(--text-secondary)]',
          )}
        >
          {day}
        </span>
      )}
      {!isDesktop && visibleCategories.length > 0 && totalEntries > 0 && (
        <DayDot categories={visibleCategories} />
      )}
      <div className="flex-1" />
      {isDesktop && <EntryCountBadge count={totalEntries} isHovered={isHovered} />}
    </div>
  );
});

DateNumber.displayName = 'DateNumber';
export default DateNumber;
