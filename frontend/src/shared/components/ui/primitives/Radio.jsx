import { forwardRef, useId, createContext, useContext } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';

const RadioGroupContext = createContext(null);

export function RadioGroup({
  name: explicitName,
  value,
  onChange,
  disabled = false,
  orientation = 'vertical',
  label,
  children,
  className = '',
  'aria-label': ariaLabel,
}) {
  const reactId = useId();
  const name = explicitName || `radio-group-${reactId.replace(/:/g, '')}`;

  return (
    <RadioGroupContext.Provider value={{ name, value, onChange, disabled }}>
      <div
        role="radiogroup"
        aria-label={label || ariaLabel}
        className={cn(
          'flex gap-2',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap items-center',
          className,
        )}
      >
        {label && (
          <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] mb-1 select-none">
            {label}
          </span>
        )}
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export const Radio = forwardRef(({
  id: explicitId,
  name: propName,
  value,
  checked: propChecked,
  onChange: propOnChange,
  disabled: propDisabled = false,
  label,
  description,
  className = '',
  ...props
}, ref) => {
  const group = useContext(RadioGroupContext);
  const reactId = useId();
  const id = explicitId || `radio-${reactId.replace(/:/g, '')}`;

  const name = group?.name || propName;
  const isChecked = group ? group.value === value : propChecked;
  const isDisabled = group?.disabled || propDisabled;

  const handleChange = (e) => {
    if (isDisabled) return;
    if (group?.onChange) group.onChange(value);
    else if (propOnChange) propOnChange(e);
  };

  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex items-start gap-3 min-h-[44px] py-1 cursor-pointer select-none group',
        isDisabled && 'cursor-not-allowed opacity-60',
        className
      )}
    >
      <div className="relative flex items-center justify-center w-6 h-6 min-w-[24px] mt-0.5">
        <input
          ref={ref}
          id={id}
          type="radio"
          name={name}
          value={value}
          checked={isChecked}
          disabled={isDisabled}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed peer"
          {...props}
        />

        <div
          aria-hidden="true"
          className={cn(
            'w-5 h-5 rounded-full border transition-all duration-[var(--duration-fast,120ms)] ease-out pointer-events-none',
            'flex items-center justify-center',
            'border-[var(--input-border)] bg-[var(--input-bg)]',
            'group-hover:border-[var(--input-border-hover)]',
            // Focus ring
            'peer-focus-visible:ring-[var(--focus-width,2px)] peer-focus-visible:ring-[var(--focus)] peer-focus-visible:ring-offset-[var(--focus-offset,2px)] peer-focus-visible:ring-offset-[var(--bg-elevated)]',
            isChecked && 'border-[var(--brand)]',
            isDisabled && 'bg-[var(--input-bg-disabled)] border-[var(--input-border)]',
          )}
        >
          {isChecked && (
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full bg-[var(--brand)] transition-transform duration-[var(--duration-fast,120ms)] scale-100',
                isDisabled && 'bg-[var(--text-disabled)]',
              )}
            />
          )}
        </div>
      </div>

      {(label || description) && (
        <div
          className={cn(
            'flex flex-col cursor-pointer justify-center min-h-[24px] pt-0.5',
            isDisabled && 'cursor-not-allowed text-[var(--text-disabled)]',
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
        </div>
      )}
    </label>
  );
});

Radio.displayName = 'Radio';
export default Radio;
