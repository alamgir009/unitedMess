import { useSearchParams } from 'react-router-dom';
import { cn } from '@/core/utils/helpers/string.helper';

const OPTIONS = [
  { value: 'meals', label: 'Meals' },
  { value: 'markets', label: 'Markets' },
  { value: 'payments', label: 'Payments' },
];

const SegmentedControl = ({ className = '' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get('view') || 'meals';

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
        'inline-flex bg-muted/80 p-0.5 rounded-xl gap-0.5 border border-border/40',
        'shadow-sm',
        className,
      )}
    >
      {OPTIONS.map(({ value, label }, i) => (
        <button
          key={value}
          role="tab"
          aria-selected={active === value}
          onClick={() => handleChange(value)}
          className={cn(
            'relative px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            active === value
              ? 'bg-background text-foreground shadow-sm font-semibold shadow-black/[0.03] dark:shadow-black/[0.15]'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

SegmentedControl.displayName = 'SegmentedControl';
export default SegmentedControl;
