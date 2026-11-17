import { createContext, useContext, useId } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const FieldContext = createContext(null);

export function useFieldContext() {
  return useContext(FieldContext);
}

export function Field({
  id: explicitId,
  label,
  helperText,
  error,
  success,
  required = false,
  optional = false,
  children,
  className = '',
  labelAction,
}) {
  const generatedId = useId();
  const id = explicitId || `field-${generatedId.replace(/:/g, '')}`;
  const errorId = `${id}-error`;
  const successId = `${id}-success`;
  const helperId = `${id}-helper`;

  const describedByParts = [];
  if (error) describedByParts.push(errorId);
  else if (success) describedByParts.push(successId);
  if (helperText) describedByParts.push(helperId);
  const ariaDescribedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  const contextValue = {
    id,
    errorId,
    successId,
    helperId,
    ariaDescribedBy,
    hasError: Boolean(error),
    hasSuccess: Boolean(success),
    required,
  };

  return (
    <FieldContext.Provider value={contextValue}>
      <div className={cn('flex flex-col gap-[var(--label-gap,6px)] min-w-0 w-full', className)}>
        {label && (
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={id}
              className="text-xs sm:text-sm font-semibold tracking-tight text-[var(--text-secondary)] select-none cursor-pointer flex items-center gap-1.5"
            >
              <span>{label}</span>
              {required && (
                <span className="text-[var(--danger-text)] font-bold" aria-hidden="true">
                  *
                </span>
              )}
              {optional && (
                <span className="text-xs font-normal text-[var(--text-tertiary)]">
                  (Optional)
                </span>
              )}
            </label>
            {labelAction && <div className="text-xs shrink-0">{labelAction}</div>}
          </div>
        )}

        <div className="relative min-w-0 w-full">{children}</div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger-text)] animate-fade-in"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {!error && success && (
          <p
            id={successId}
            role="status"
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--success-text)] animate-fade-in"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{success}</span>
          </p>
        )}

        {!error && !success && helperText && (
          <p
            id={helperId}
            className="text-xs text-[var(--text-tertiary)] leading-relaxed"
          >
            {helperText}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

export default Field;

