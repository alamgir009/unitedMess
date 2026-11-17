/* eslint-disable react-refresh/only-export-components */
import { forwardRef, useId } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';
import { ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFieldContext } from './Field';

export const selectVariants = {
  base: cn(
    'w-full min-w-0 box-border appearance-none',
    'rounded-[var(--radius-md)] border text-left',
    'font-sans text-[16px] sm:text-sm text-[var(--text-primary)]',
    'transition-colors duration-[var(--duration-fast,120ms)] ease-out',
    'focus:outline-none focus-visible:outline-none focus-visible:ring-[var(--focus-width,2px)] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-[var(--focus-offset,2px)] focus-visible:ring-offset-[var(--bg-elevated)]',
    'disabled:bg-[var(--input-bg-disabled)] disabled:text-[var(--text-disabled)] disabled:cursor-not-allowed disabled:opacity-75',
    'read-only:bg-[var(--bg-subtle)] read-only:text-[var(--text-secondary)]',
  ),
  variants: {
    default: 'bg-[var(--input-bg)] border-[var(--input-border)] hover:border-[var(--input-border-hover)]',
    filled: 'bg-[var(--bg-surface)] border-transparent hover:border-[var(--input-border)] focus:bg-[var(--input-bg)]',
    record: 'bg-[var(--bg-muted)] border-[var(--border-default)] hover:border-[var(--border-strong)]',
  },
  sizes: {
    sm: 'h-[var(--control-height-sm)] min-h-[var(--control-height-sm)] pl-2.5 pr-8 py-1 text-xs',
    md: 'h-[var(--control-height-md)] min-h-[var(--control-height-md)] pl-3 pr-9 py-2 text-sm',
    lg: 'h-[var(--control-height-lg)] min-h-[var(--control-height-lg)] pl-4 pr-10 py-2.5 text-base',
  },
  states: {
    error: 'border-[var(--input-border-error)] focus-visible:ring-[var(--danger-text)] text-[var(--text-primary)]',
    success: 'border-[var(--success-border)] focus-visible:ring-[var(--success-text)]',
  },
};

export const Select = forwardRef(({
  variant = 'default',
  size = 'md',
  label,
  helperText,
  error,
  success,
  leftIcon,
  className = '',
  disabled = false,
  id: explicitId,
  value,
  onChange,
  children,
  options = [],
  placeholder,
  'aria-describedby': explicitAriaDescribedBy,
  ...props
}, ref) => {
  const fieldContext = useFieldContext();
  const reactId = useId();
  const selectId = explicitId || (fieldContext ? fieldContext.id : `select-${reactId.replace(/:/g, '')}`);

  const activeError = error ?? fieldContext?.hasError ? error : undefined;
  const activeSuccess = success ?? fieldContext?.hasSuccess ? success : undefined;

  const describedIds = [];
  if (explicitAriaDescribedBy) describedIds.push(explicitAriaDescribedBy);
  if (activeError) describedIds.push(`${selectId}-error`);
  else if (activeSuccess) describedIds.push(`${selectId}-success`);
  else if (helperText) describedIds.push(`${selectId}-helper`);
  const finalAriaDescribedBy = describedIds.length > 0 ? describedIds.join(' ') : undefined;

  const resolvedVariant = selectVariants.variants[variant] || selectVariants.variants.default;
  const resolvedSize = selectVariants.sizes[size] || selectVariants.sizes.md;
  const stateClass = activeError
    ? selectVariants.states.error
    : activeSuccess
      ? selectVariants.states.success
      : '';

  const selectNode = (
    <div className="relative w-full min-w-0">
      {leftIcon && (
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none flex items-center justify-center w-4 h-4 shrink-0"
          aria-hidden="true"
        >
          {leftIcon}
        </span>
      )}

      <select
        ref={ref}
        id={selectId}
        disabled={disabled}
        value={value}
        onChange={onChange}
        aria-invalid={activeError ? 'true' : 'false'}
        data-state={activeSuccess ? 'success' : undefined}
        aria-describedby={finalAriaDescribedBy}
        className={cn(
          selectVariants.base,
          resolvedVariant,
          resolvedSize,
          stateClass,
          leftIcon ? 'pl-9' : 'pl-3',
          'cursor-pointer',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.length > 0
          ? options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))
          : children}
      </select>

      <span
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none flex items-center justify-center w-4 h-4 shrink-0"
        aria-hidden="true"
      >
        <ChevronDown className="w-4 h-4" />
      </span>
    </div>
  );

  if (fieldContext) return selectNode;

  return (
    <div className="flex flex-col gap-[var(--label-gap,6px)] w-full min-w-0">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs sm:text-sm font-semibold tracking-tight text-[var(--text-secondary)] select-none cursor-pointer"
        >
          {label}
        </label>
      )}

      {selectNode}

      {activeError && (
        <p
          id={`${selectId}-error`}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger-text)]"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{activeError}</span>
        </p>
      )}

      {!activeError && activeSuccess && (
        <p
          id={`${selectId}-success`}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--success-text)]"
          role="status"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{activeSuccess}</span>
        </p>
      )}

      {!activeError && !activeSuccess && helperText && (
        <p id={`${selectId}-helper`} className="text-xs text-[var(--text-tertiary)]">
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;

