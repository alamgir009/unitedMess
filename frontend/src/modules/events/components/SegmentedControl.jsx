import { useSearchParams } from 'react-router-dom';
import { cn } from '@/core/utils/helpers/string.helper';
import { Utensils, ShoppingBag, CreditCard, Vote } from 'lucide-react';
import '@/shared/components/ui/SegmentedControl/segmented-control.css';

const OPTIONS = [
  { value: 'meals', label: 'Meals', icon: Utensils },
  { value: 'markets', label: 'Markets', icon: ShoppingBag },
  { value: 'payments', label: 'Payments', icon: CreditCard },
  { value: 'votes', label: 'Votes', icon: Vote },
];

const SegmentedControl = ({ className = '', isAdmin = true }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get('view') || 'meals';

  const options = isAdmin ? OPTIONS : OPTIONS.filter((o) => o.value !== 'votes');

  const handleChange = (value) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div
      role="tablist"
      aria-label="Calendar event category"
      className={cn(
        'segmented-control w-full sm:w-auto flex sm:inline-flex overflow-x-auto no-scrollbar',
        className,
      )}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={active === value}
          aria-pressed={active === value}
          onClick={() => handleChange(value)}
          className="segmented-control-button flex-1 sm:flex-initial gap-1.5 sm:gap-2 whitespace-nowrap"
        >
          <Icon size={16} aria-hidden="true" className="shrink-0 hidden sm:block" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

SegmentedControl.displayName = 'SegmentedControl';
export default SegmentedControl;
