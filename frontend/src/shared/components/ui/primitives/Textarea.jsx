import { forwardRef, useId } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFieldContext } from './Field';

export const textareaVariants = {
  base: cn(
    'w-full min-w-0 box-border',
    'rounded-[var(--radius-md)] border text-left',
    'font-sans text-[16px] sm:text-sm text-[var(--text-primary)]',
    'placeholder:text-[var(--text-muted)]',
    'transition-colors duration-[var(--duration-fast,120ms)] ease-out',
    'caret-[var(--brand)] min-h-[96px] py-2.5 px-3 resize-y',
    'focus:outline-none focus-visible:outline-none focus-visible:ring-[var(--focus-width,2px)] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-[var(--focus-offset,2px)] focus-visible:ring-offset-[var(--bg-elevated)]',
    'disabled:bg-[var(--input-bg-disabled)] disabled:text-[var(--text-disabled)] disabled:cursor-not-allowed disabled:opacity-75',
    'read-only:bg-[var(--bg-subtle)] read-only:text-[var(--text-secondary)] read-only:cursor-default',
  ),
  variants: {
    default: 'bg-[var(--input-bg)] border-[var(--input-border)] hover:border-[var(--input-border-hover)]',
    filled: 'bg-[var(--bg-surface)] border-transparent hover:border-[var(--input-border)] focus:bg-[var(--input-bg)]',
    record: 'bg-[var(--bg-muted)] border-[var(--border-default)] hover:border-[var(--border-strong)]',
  },
  states: {
    error: 'border-[var(--input-border-error)] focus-visible:ring-[var(--danger-text)] text-[var(--text-primary)]',
    success: 'border-[var(--success-border)] focus-visible:ring-[var(--success-text)]',
  },
};

export const Textarea = forwardRef(({
  variant = 'default',
  label,
  helperText,
  error,
  success,
  className = '',
  disabled = false,
  readOnly = false,
  id: explicitId,
  rows = 3,
  value,
  onChange,
  'aria-describedby': explicitAriaDescribedBy,
  ...props
}, ref) => {
  const fieldContext = useFieldContext();
  const reactId = useId();
  const textareaId = explicitId || (fieldContext ? fieldContext.id : `textarea-${reactId.replace(/:/g, '')}`);

  const activeError = error ?? fieldContext?.hasError ? error : undefined;
  const activeSuccess = success ?? fieldContext?.hasSuccess ? success : undefined;

  const describedIds = [];
  if (explicitAriaDescribedBy) describedIds.push(explicitAriaDescribedBy);
  if (activeError) describedIds.push(`${textareaId}-error`);
  else if (activeSuccess) describedIds.push(`${textareaId}-success`);
  else if (helperText) describedIds.push(`${textareaId}-helper`);
  const finalAriaDescribedBy = describedIds.length > 0 ? describedIds.join(' ') : undefined;

  const resolvedVariant = textareaVariants.variants[variant] || textareaVariants.variants.default;
  const stateClass = activeError
    ? textareaVariants.states.error
    : activeSuccess
      ? textareaVariants.states.success
      : '';

  const textareaNode = (
    <textarea
      ref={ref}
      id={textareaId}
      rows={rows}
      disabled={disabled}
      readOnly={readOnly}
      value={value}
      onChange={onChange}
      aria-invalid={activeError ? 'true' : 'false'}
      data-state={activeSuccess ? 'success' : undefined}
      aria-describedby={finalAriaDescribedBy}
      className={cn(
        textareaVariants.base,
        resolvedVariant,
        stateClass,
        className,
      )}
      {...props}
    />
  );

  if (fieldContext) return textareaNode;

  return (
    <div className="flex flex-col gap-[var(--label-gap,6px)] w-full min-w-0">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs sm:text-sm font-semibold tracking-tight text-[var(--text-secondary)] select-none cursor-pointer"
        >
          {label}
        </label>
      )}

      {textareaNode}

      {activeError && (
        <p
          id={`${textareaId}-error`}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger-text)]"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{activeError}</span>
        </p>
      )}

      {!activeError && activeSuccess && (
        <p
          id={`${textareaId}-success`}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--success-text)]"
          role="status"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{activeSuccess}</span>
        </p>
      )}

      {!activeError && !activeSuccess && helperText && (
        <p id={`${textareaId}-helper`} className="text-xs text-[var(--text-tertiary)]">
          {helperText}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
export default Textarea;
