import { memo } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';
import {
  HiOutlineSun,
  HiOutlineShoppingBag,
  HiOutlineCreditCard,
  HiOutlineUsers,
  HiOutlineBell,
} from 'react-icons/hi2';

const TABS = [
  { key: 'meals', label: 'Meals', icon: HiOutlineSun, activeColor: 'text-[var(--slot-day)]' },
  { key: 'markets', label: 'Markets', icon: HiOutlineShoppingBag, activeColor: 'text-[var(--market-accent)]' },
  { key: 'payments', label: 'Payments', icon: HiOutlineCreditCard, activeColor: 'text-[var(--payment-paid)]' },
  { key: 'members', label: 'Members', icon: HiOutlineUsers, activeColor: 'text-[var(--info)]' },
  { key: 'notifications', label: 'Notifications', icon: HiOutlineBell, activeColor: 'text-[var(--warning)]' },
];

const CategoryTabs = memo(({ active, onChange }) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
      {TABS.map(({ key, label, icon: Icon, activeColor }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(key)}
            className={cn(
              'relative inline-flex items-center gap-2 px-4 py-2.5',
              'text-sm font-medium whitespace-nowrap',
              'transition-all duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              'rounded-xl min-h-[44px]',
              isActive
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]/50',
            )}
          >
            <Icon
              className={cn('w-4 h-4 shrink-0 transition-colors duration-150', isActive ? activeColor : 'text-[var(--text-muted)]')}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.slice(0, 4)}</span>
          </button>
        );
      })}
    </div>
  );
});

CategoryTabs.displayName = 'CategoryTabs';
export default CategoryTabs;
