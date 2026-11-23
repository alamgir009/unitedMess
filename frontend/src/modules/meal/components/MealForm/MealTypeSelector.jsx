import {
  HiOutlineCheck,
  HiOutlineMoon,
  HiOutlineNoSymbol,
  HiOutlineSparkles,
  HiOutlineSun,
} from 'react-icons/hi2';
import { cn } from '@/core/utils/helpers/string.helper';

const mealTypes = [
  { value: 'both', label: 'Both', description: 'Day & Night · 2 meals', icon: HiOutlineSparkles },
  { value: 'day', label: 'Day', description: 'Morning only · 1 meal', icon: HiOutlineSun },
  { value: 'night', label: 'Night', description: 'Evening only · 1 meal', icon: HiOutlineMoon },
  { value: 'off', label: 'Off', description: 'No meals · 0 meals', icon: HiOutlineNoSymbol },
];

export default function MealTypeSelector({ value, onChange, disabled = false, allowClear = false }) {
  const selectedIndex = mealTypes.findIndex((option) => option.value === value);

  const handleKeyDown = (event, index) => {
    const directions = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const nextIndex = (index + direction + mealTypes.length) % mealTypes.length;
    onChange(mealTypes[nextIndex].value);
    event.currentTarget.parentElement.children[nextIndex].focus();
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <span className="text-xs font-medium text-[var(--text-secondary)] select-none">Meal type</span>
      <div role={allowClear ? 'group' : 'radiogroup'} aria-label="Meal type" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {mealTypes.map(({ value: option, label, description, icon: Icon }, index) => {
          const isSelected = index === selectedIndex;
          const selectionProps = allowClear
            ? { 'aria-pressed': isSelected }
            : {
                role: 'radio',
                'aria-checked': isSelected,
                tabIndex: index === Math.max(0, selectedIndex) ? 0 : -1,
                onKeyDown: (event) => handleKeyDown(event, index),
              };

          return (
            <button
              key={option}
              type="button"
              {...selectionProps}
              onClick={() => onChange(allowClear && isSelected ? '' : option)}
              disabled={disabled}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 min-h-[48px] py-2 px-2.5 rounded-[8px] border transition-colors text-center select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]',
                isSelected
                  ? 'border-[var(--brand)] bg-[var(--accent-subtle)] text-[var(--brand)] font-semibold shadow-xs'
                  : 'border-[var(--border-contrast)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-contrast-hover)] hover:bg-[var(--bg-muted)]',
                disabled && 'opacity-60 cursor-not-allowed',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold leading-tight">{label}</span>
              <span className="text-[10px] text-[var(--text-muted)] leading-tight hidden sm:block">{description}</span>
              {isSelected && (
                <span
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--brand)] text-[var(--text-on-brand)] flex items-center justify-center"
                  aria-hidden="true"
                >
                  <HiOutlineCheck className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
