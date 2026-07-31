import { useSearchParams } from 'react-router-dom';
import { cn } from '@/core/utils/helpers/string.helper';

const OPTIONS = [
  { value: 'meals', label: 'Meals' },
  { value: 'markets', label: 'Markets' },
  { value: 'payments', label: 'Payments' },
  { value: 'votes', label: 'Votes' },
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
        'flex w-full bg-muted p-0.5 rounded-xl border border-border/40',
        'sm:inline-flex sm:w-auto sm:gap-0.5',
        className,
      )}
      style={{ boxShadow: 'var(--inset-well)' }}
    >
      {OPTIONS.map(({ value, label }, i) => (
        <button
          key={value}
          role="tab"
          aria-selected={active === value}
          onClick={() => handleChange(value)}
          className={cn(
            'relative flex-1 py-1.5 text-sm font-medium rounded-lg transition-all duration-150',
            'sm:flex-none sm:px-4',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            active === value
              ? 'bg-[var(--bg-elevated)] dark:bg-gray-400/30 text-foreground font-semibold shadow-[var(--inset-well-active)]'
              : 'text-[var(--text-secondary)] hover:text-foreground',
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
