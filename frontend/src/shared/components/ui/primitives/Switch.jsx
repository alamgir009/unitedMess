import { forwardRef, useId } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';

export const Switch = forwardRef(({
  id: explicitId,
  checked = false,
  onChange,
  disabled = false,
  label,
  description,
  className = '',
  name,
  ...props
}, ref) => {
  const reactId = useId();
  const id = explicitId || `switch-${reactId.replace(/:/g, '')}`;

  const toggle = () => {
    if (disabled) return;
    onChange?.(!checked);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 min-h-[44px] cursor-pointer select-none group',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
      onClick={toggle}
    >
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        name={name}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex items-center shrink-0 w-11 h-6 p-0.5 rounded-full border transition-colors duration-[var(--duration-fast,120ms)] ease-out',
          'focus:outline-none focus-visible:outline-none focus-visible:ring-[var(--focus-width,2px)] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-[var(--focus-offset,2px)] focus-visible:ring-offset-[var(--bg-elevated)]',
          checked
            ? 'bg-[var(--brand)] border-[var(--brand)]'
            : 'bg-[var(--input-bg)] border-[var(--input-border)] group-hover:border-[var(--input-border-hover)]',
          disabled && 'bg-[var(--input-bg-disabled)] border-[var(--input-border)] cursor-not-allowed',
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block w-5 h-5 rounded-full bg-[var(--text-on-brand)] shadow-sm pointer-events-none transform transition-transform duration-[var(--duration-fast,120ms)] ease-out',
            checked ? 'translate-x-5' : 'translate-x-0 bg-[var(--text-muted)] group-hover:bg-[var(--text-secondary)]',
            disabled && 'bg-[var(--text-disabled)]',
          )}
        />
      </button>

      {(label || description) && (
        <div className="flex flex-col justify-center min-h-[24px]">
          {label && (
            <span className="text-sm font-medium text-[var(--text-primary)] leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-[var(--text-muted)] mt-0.5 leading-normal">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

Switch.displayName = 'Switch';
export default Switch;
