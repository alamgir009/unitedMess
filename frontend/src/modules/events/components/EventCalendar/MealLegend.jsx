import { memo } from 'react';
import { HiOutlineSparkles, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi2';
import { cn } from '@/core/utils/helpers/string.helper';

const LEGEND_ITEMS = [
  { slot: 'day', Icon: HiOutlineSun, label: 'Day = 1 Meal' },
  { slot: 'night', Icon: HiOutlineMoon, label: 'Night = 1 Meal' },
  { slot: 'both', Icon: HiOutlineSparkles, label: 'Both = 2 Meals' },
];

const MealLegend = memo(() => {
  return (
    <div
      role="img"
      aria-label="Meal type legend: Day = 1 Meal, Night = 1 Meal, Both = 2 Meals"
      className={cn(
        'flex items-center justify-center flex-wrap gap-x-5 gap-y-2 sm:gap-x-6',
        'py-2.5 px-5 sm:px-6',
        'rounded-b-xl',
        'border-t border-[var(--calendar-border)]',
        'bg-[var(--calendar-header-bg)]',
      )}
    >
      {LEGEND_ITEMS.map(({ slot, Icon, label }) => (
        <div key={slot} className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center justify-center w-5 h-5 rounded-md shrink-0',
              slot === 'day' && 'bg-[var(--slot-day)]/15 text-[var(--slot-day)]',
              slot === 'night' && 'bg-[var(--slot-night)]/15 text-[var(--slot-night)]',
              slot === 'both' && 'bg-[var(--slot-both)]/15 text-[var(--slot-both)]',
            )}
          >
            <Icon className="w-3 h-3" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-semibold text-[var(--calendar-header-text)] whitespace-nowrap">{label}</span>
        </div>
      ))}
    </div>
  );
});

MealLegend.displayName = 'MealLegend';
export default MealLegend;
