import { forwardRef } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';
import { X } from 'lucide-react';

const Input = forwardRef(({
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
  id,
  type = 'text',
  value,
  onChange,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

  const stateBorder = error
    ? 'border-destructive focus:ring-destructive/30 focus:border-destructive'
    : success
      ? 'border-success/60 focus:ring-success/30 focus:border-success'
      : 'border-border focus:ring-ring/30 focus:border-ring';

  const variants = {
    default: cn(
      'bg-card text-foreground placeholder:text-muted-foreground',
      'border rounded-lg caret-foreground',
      'focus:outline-none focus:ring-2',
      'transition-all duration-[var(--duration-fast)]',
      '[&:-webkit-autofill]:bg-card [&:-webkit-autofill]:text-foreground',
      stateBorder,
    ),
    filled: cn(
      'bg-muted text-foreground placeholder:text-muted-foreground',
      'border border-transparent rounded-lg caret-foreground',
      'focus:bg-card focus:outline-none focus:ring-2',
      'transition-all duration-[var(--duration-fast)]',
      '[&:-webkit-autofill]:bg-muted [&:-webkit-autofill]:text-foreground',
      stateBorder,
    ),
    glass: cn(
      'bg-card/60 backdrop-blur-sm text-foreground placeholder:text-muted-foreground',
      'border rounded-lg caret-foreground',
      'focus:outline-none focus:ring-2',
      'transition-all duration-[var(--duration-fast)]',
      '[&:-webkit-autofill]:text-foreground',
      stateBorder,
    ),
  };

  const sizes = {
    sm: 'h-8 text-sm',
    md: 'h-11 text-sm',
    lg: 'h-12 text-base',
  };

  const iconPadding = {
    left: leftIcon ? 'pl-10' : 'pl-3',
    right: (clearable && value) || rightIcon || rightAction ? 'pr-10' : 'pr-3',
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
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
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          className={cn(
            variants[variant],
            sizes[size],
            iconPadding.left,
            iconPadding.right,
            'w-full',
            disabled && 'opacity-50 cursor-not-allowed',
            readOnly && 'cursor-default opacity-80',
          )}
          {...props}
        />

        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange?.({ target: { value: '' } } )}
            aria-label="Clear input"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {rightIcon && !(clearable && value) && !rightAction && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {rightIcon}
          </span>
        )}

        {rightAction && !(clearable && value) && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightAction}
          </span>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-xs text-destructive font-medium" role="alert">
          {error}
        </p>
      )}
      {!error && success && (
        <p className="text-xs text-success font-medium">
          {success}
        </p>
      )}
      {!error && !success && helperText && (
        <p id={`${inputId}-helper`} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
