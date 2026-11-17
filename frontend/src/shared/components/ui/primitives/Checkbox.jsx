import { forwardRef, useId } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';
import { Check, Minus } from 'lucide-react';

export const Checkbox = forwardRef(({
  id: explicitId,
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  label,
  description,
  error,
  className = '',
  name,
  value,
  ...props
}, ref) => {
  const reactId = useId();
  const id = explicitId || `checkbox-${reactId.replace(/:/g, '')}`;

  return (
    <div className={cn('inline-flex items-start gap-3 min-h-[44px] py-1 cursor-pointer select-none group', disabled && 'cursor-not-allowed opacity-60', className)}>
      <div className="relative flex items-center justify-center w-6 h-6 min-w-[24px] mt-0.5">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          aria-invalid={error ? 'true' : undefined}
          className="peer sr-only"
          {...props}
        />

        <div
          aria-hidden="true"
          className={cn(
            'w-5 h-5 rounded-[var(--radius-sm)] border transition-all duration-[var(--duration-fast,120ms)] ease-out',
            'flex items-center justify-center',
            'border-[var(--input-border)] bg-[var(--input-bg)]',
            'group-hover:border-[var(--input-border-hover)]',
            // Focus ring on peer-focus-visible
            'peer-focus-visible:ring-[var(--focus-width,2px)] peer-focus-visible:ring-[var(--focus)] peer-focus-visible:ring-offset-[var(--focus-offset,2px)] peer-focus-visible:ring-offset-[var(--bg-elevated)]',
            (checked || indeterminate) && 'bg-[var(--brand)] border-[var(--brand)] text-[var(--text-on-brand)]',
            error && 'border-[var(--danger-text)]',
            disabled && 'bg-[var(--input-bg-disabled)] border-[var(--input-border)] text-[var(--text-disabled)]',
          )}
        >
          {indeterminate ? (
            <Minus className="w-3.5 h-3.5 stroke-[3]" />
          ) : checked ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : null}
        </div>
      </div>

      {(label || description) && (
        <label
          htmlFor={id}
          className={cn(
            'flex flex-col cursor-pointer justify-center min-h-[24px] pt-0.5',
            disabled && 'cursor-not-allowed text-[var(--text-disabled)]',
          )}
        >
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
          {error && (
            <span className="text-xs font-semibold text-[var(--danger-text)] mt-1">
              {error}
            </span>
          )}
        </label>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
export default Checkbox;
