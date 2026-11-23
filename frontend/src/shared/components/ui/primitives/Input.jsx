/* eslint-disable react-refresh/only-export-components */
import { forwardRef, useId } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFieldContext } from './Field';

export const inputVariants = {
  base: cn(
    'w-full min-w-0 box-border',
    'rounded-[var(--radius-md)] border text-left',
    'font-sans text-[16px] sm:text-sm text-[var(--text-primary)]',
    'placeholder:text-[var(--text-muted)]',
    'transition-colors duration-[var(--duration-fast,120ms)] ease-out',
    'caret-[var(--brand)]',
    'focus:outline-none focus-visible:outline-none focus-visible:ring-[var(--focus-width,2px)] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-[var(--focus-offset,2px)] focus-visible:ring-offset-[var(--bg-elevated)]',
    'disabled:bg-[var(--input-bg-disabled)] disabled:text-[var(--text-disabled)] disabled:cursor-not-allowed disabled:opacity-75',
    'read-only:bg-[var(--bg-subtle)] read-only:text-[var(--text-secondary)] read-only:cursor-default',
  ),
  variants: {
    default: 'bg-[var(--input-bg)] border-[var(--input-border)] hover:border-[var(--input-border-hover)]',
    filled: 'bg-[var(--bg-surface)] border-transparent hover:border-[var(--input-border)] focus:bg-[var(--input-bg)]',
    record: 'bg-[var(--bg-muted)] border-[var(--border-default)] hover:border-[var(--border-strong)]',
  },
  sizes: {
    sm: 'h-[var(--control-height-sm)] min-h-[var(--control-height-sm)] px-2.5 py-1 text-xs',
    md: 'h-[var(--control-height-md)] min-h-[var(--control-height-md)] px-3 py-2 text-sm',
    lg: 'h-[var(--control-height-lg)] min-h-[var(--control-height-lg)] px-4 py-2.5 text-base',
  },
  states: {
    error: 'border-[var(--input-border-error)] focus-visible:ring-[var(--danger-text)] text-[var(--text-primary)]',
    success: 'border-[var(--success-border)] focus-visible:ring-[var(--success-text)]',
  },
};

export const Input = forwardRef(({
  variant = 'default',
  size = 'md',
  label,
  helperText,
  error,
  success,
  leftIcon,
  rightIcon,
  rightAction,
  className = '',
  disabled = false,
  readOnly = false,
  clearable = false,
  id: explicitId,
  type = 'text',
  value,
  onChange,
  onClear,
  'aria-describedby': explicitAriaDescribedBy,
  ...props
}, ref) => {
  const fieldContext = useFieldContext();
  const reactId = useId();
  const inputId = explicitId || (fieldContext ? fieldContext.id : `input-${reactId.replace(/:/g, '')}`);

  const activeError = error ?? fieldContext?.hasError ? error : undefined;
  const activeSuccess = success ?? fieldContext?.hasSuccess ? success : undefined;

  // Build stable described-by list preserving any passed-in describedBy
  const describedIds = [];
  if (explicitAriaDescribedBy) describedIds.push(explicitAriaDescribedBy);
  if (activeError) describedIds.push(`${inputId}-error`);
  else if (activeSuccess) describedIds.push(`${inputId}-success`);
  else if (helperText) describedIds.push(`${inputId}-helper`);
  const finalAriaDescribedBy = describedIds.length > 0 ? describedIds.join(' ') : undefined;

  const resolvedVariant = inputVariants.variants[variant] || inputVariants.variants.default;
  const resolvedSize = inputVariants.sizes[size] || inputVariants.sizes.md;
  const stateClass = activeError
    ? inputVariants.states.error
    : activeSuccess
      ? inputVariants.states.success
      : '';

  const inputNode = (
    <div className="relative w-full min-w-0">
      {leftIcon && (
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none flex items-center justify-center w-4 h-4 shrink-0"
          aria-hidden="true"
        >
          {leftIcon}
        </span>
      )}

      <input
        ref={ref}
        id={inputId}
        type={type}
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        onChange={onChange}
        aria-invalid={activeError ? 'true' : 'false'}
        data-state={activeSuccess ? 'success' : undefined}
        aria-describedby={finalAriaDescribedBy}
        className={cn(
          inputVariants.base,
          resolvedVariant,
          resolvedSize,
          stateClass,
          leftIcon ? 'pl-9' : 'pl-3',
          rightAction ? 'pr-12' : ((clearable && value) || rightIcon ? 'pr-9' : 'pr-3'),
          'touch-target-exempt',
          className,
        )}
        {...props}
      />

      {clearable && value && !disabled && !readOnly && (
        <button
          type="button"
          onClick={() => {
            if (onClear) onClear();
            else onChange?.({ target: { value: '' } });
          }}
          aria-label="Clear input"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 min-w-[28px] min-h-[28px] p-1 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        >
          <X className="w-4 h-4 shrink-0" />
        </button>
      )}

      {rightIcon && !(clearable && value) && !rightAction && (
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none flex items-center justify-center w-4 h-4 shrink-0"
          aria-hidden="true"
        >
          {rightIcon}
        </span>
      )}

      {rightAction && !(clearable && value) && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
          {rightAction}
        </span>
      )}
    </div>
  );

  // If already wrapped in Field, return inputNode directly
  if (fieldContext) return inputNode;

  // Otherwise, render full field with label & feedback
  return (
    <div className="flex flex-col gap-[var(--label-gap,6px)] w-full min-w-0">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs sm:text-sm font-semibold tracking-tight text-[var(--text-secondary)] select-none cursor-pointer"
        >
          {label}
        </label>
      )}

      {inputNode}

      {activeError && (
        <p
          id={`${inputId}-error`}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger-text)]"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{activeError}</span>
        </p>
      )}

      {!activeError && activeSuccess && (
        <p
          id={`${inputId}-success`}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--success-text)]"
          role="status"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{activeSuccess}</span>
        </p>
      )}

      {!activeError && !activeSuccess && helperText && (
        <p id={`${inputId}-helper`} className="text-xs text-[var(--text-tertiary)]">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;

