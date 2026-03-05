import { forwardRef } from 'react';
import { clsx } from 'clsx';

/**
 * Button Component
 * Variants: primary | secondary | outline | ghost | glass | danger
 * Sizes: xs | sm | md | lg | xl
 */
const Button = forwardRef(({
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    loading = false,
    leftIcon,
    rightIcon,
    children,
    ...props
}, ref) => {

    const baseStyles = [
        'relative inline-flex items-center justify-center gap-2',
        'font-semibold rounded-xl select-none',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-50',
        'touch-target',
    ];

    const variants = {
        primary: [
            'bg-gradient-to-r from-primary-500 to-secondary-500',
            'text-white',
            'shadow-md hover:shadow-lg hover:-translate-y-0.5',
            'hover:opacity-90',
            'focus-visible:ring-ring',
            // Origin OS 6 glow on hover
            'hover:shadow-[0_4px_24px_rgba(14,129,214,0.4)]',
        ],
        secondary: [
            'bg-secondary text-secondary-foreground',
            'border border-border',
            'hover:bg-secondary/80 hover:-translate-y-0.5',
            'shadow-sm hover:shadow-md',
            'focus-visible:ring-ring',
        ],
        outline: [
            'border-2 border-primary/60 text-primary',
            'bg-transparent',
            'hover:bg-primary/8 hover:border-primary hover:-translate-y-0.5',
            'focus-visible:ring-ring',
        ],
        ghost: [
            'text-foreground bg-transparent',
            'hover:bg-muted hover:text-foreground',
            'focus-visible:ring-ring',
        ],
        glass: [
            'glass text-foreground',
            'hover:bg-white/20 dark:hover:bg-white/10',
            'hover:-translate-y-0.5 hover:shadow-lg',
            'focus-visible:ring-white/50',
            'border border-white/30 dark:border-white/10',
        ],
        danger: [
            'bg-destructive text-destructive-foreground',
            'hover:bg-destructive/90 hover:-translate-y-0.5',
            'shadow-sm hover:shadow-md',
            'focus-visible:ring-destructive',
        ],
    };

    const sizes = {
        xs: 'h-7 px-3 text-xs rounded-lg gap-1.5',
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6 text-sm',
        lg: 'h-12 px-8 text-base',
        xl: 'h-14 px-10 text-lg rounded-2xl',
    };

    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={clsx(baseStyles, variants[variant], sizes[size], className)}
            aria-busy={loading}
            {...props}
        >
            {/* Shimmer overlay for glass/primary on hover */}
            {(variant === 'glass' || variant === 'primary') && (
                <span
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full overflow-hidden rounded-[inherit] pointer-events-none"
                >
                    <span className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
            )}

            {/* Loading Spinner */}
            {loading && (
                <svg
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}

            {!loading && leftIcon && (
                <span className="shrink-0" aria-hidden="true">{leftIcon}</span>
            )}

            <span>{children}</span>

            {!loading && rightIcon && (
                <span className="shrink-0" aria-hidden="true">{rightIcon}</span>
            )}
        </button>
    );
});

Button.displayName = 'Button';

export default Button;
