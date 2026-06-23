import { memo } from 'react';
import { HiOutlineSun, HiOutlineMoon, HiOutlineSparkles, HiOutlineNoSymbol } from 'react-icons/hi2';
import { cn } from '@/core/utils/helpers/string.helper';

const SLOT_CONFIG = {
  day: {
    icon: HiOutlineSun,
    color: 'text-[var(--slot-day)]',
    label: 'Day meal',
  },
  night: {
    icon: HiOutlineMoon,
    color: 'text-[var(--slot-night)]',
    label: 'Night meal',
  },
  both: {
    icon: HiOutlineSparkles,
    color: 'text-[var(--slot-both)]',
    label: 'All-day meal',
  },
  off: {
    icon: HiOutlineNoSymbol,
    color: 'text-[var(--text-muted)]',
    label: 'Off',
  },
};

const SlotIcon = memo(({ slot = 'day', status = 'confirmed', size = 14 }) => {
  const config = SLOT_CONFIG[slot] || SLOT_CONFIG.day;
  const Icon = config.icon;
  const sizeClass = size === 14 ? 'w-[14px] h-[14px]' : 'w-3 h-3';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-[18px] h-[18px] shrink-0',
        status === 'pending' && 'opacity-60',
        status === 'cancelled' && 'opacity-35',
      )}
      aria-label={`${config.label}${status !== 'confirmed' ? ` (${status})` : ''}`}
    >
      <span className="relative inline-flex items-center justify-center">
        <Icon className={cn(sizeClass, config.color)} aria-hidden="true" />
        {status === 'cancelled' && (
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <span className="w-full h-[2px] bg-current rotate-[135deg] origin-center opacity-70" />
          </span>
        )}
      </span>
      {status === 'pending' && (
        <span
          className="absolute inset-0 rounded-sm border border-dashed border-current opacity-40 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </span>
  );
});

SlotIcon.displayName = 'SlotIcon';
export default SlotIcon;
