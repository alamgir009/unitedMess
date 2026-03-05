import { forwardRef } from 'react';
import { clsx } from 'clsx';

/**
 * Input Component
 * Supports: text, email, password, search, number, tel, url
 * Variants: default | filled | glass
 * States: normal, error, success, disabled
 */
const Input = forwardRef(({
    variant = 'default',
    size = 'md',
    label,
    helperText,
    error,
    success,
    leftIcon,
    rightIcon,
    className = '',
    disabled = false,
    id,
    type = 'text',
    ...props
}, ref) => {

    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

    const stateColor = error
        ? 'border-destructive focus:ring-destructive/30 focus:border-destructive'
        : success
            ? 'border-green-500/60 focus:ring-green-500/30 focus:border-green-500'
            : 'border-input focus:ring-ring/30 focus:border-ring';

    const variants = {
        default: clsx(
            // bg-card resolves to a proper surface in both light & dark mode
            'bg-card text-foreground placeholder:text-muted-foreground',
            'border rounded-xl caret-foreground',
            'focus:outline-none focus:ring-2',
            'transition-all duration-200',
            // Override browser autofill background/text
            '[&:-webkit-autofill]:bg-card [&:-webkit-autofill]:text-foreground',
            stateColor,
        ),
        filled: clsx(
            'bg-muted text-foreground placeholder:text-muted-foreground',
            'border border-transparent rounded-xl caret-foreground',
            'focus:bg-card focus:outline-none focus:ring-2',
            'transition-all duration-200',
            '[&:-webkit-autofill]:bg-muted [&:-webkit-autofill]:text-foreground',
            stateColor,
        ),
        glass: clsx(
            'glass text-foreground placeholder:text-muted-foreground',
            'border rounded-xl caret-foreground',
            'focus:outline-none focus:ring-2',
            'transition-all duration-200',
            '[&:-webkit-autofill]:text-foreground',
            stateColor,
        ),
    };

    const sizes = {
        sm: 'h-9 text-sm',
        md: 'h-11 text-sm',
        lg: 'h-12 text-base',
    };

    const iconPadding = {
        left: leftIcon ? 'pl-10' : 'pl-4',
        right: rightIcon ? 'pr-10' : 'pr-4',
    };

    return (
        <div className={clsx('flex flex-col gap-1.5', className)}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-sm font-medium text-foreground"
                >
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
                    aria-invalid={!!error}
                    aria-describedby={
                        error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
                    }
                    className={clsx(
                        variants[variant],
                        sizes[size],
                        iconPadding.left,
                        iconPadding.right,
                        'w-full',
                        disabled && 'opacity-50 cursor-not-allowed',
                    )}
                    {...props}
                />

                {rightIcon && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {rightIcon}
                    </span>
                )}
            </div>

            {error && (
                <p id={`${inputId}-error`} className="text-xs text-destructive font-medium" role="alert">
                    {error}
                </p>
            )}
            {!error && success && (
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
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
