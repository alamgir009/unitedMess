import { clsx } from 'clsx';

/**
 * Badge Component
 * Variants: default | primary | secondary | success | warning | error | info | glass
 * Sizes: sm | md | lg
 */
const Badge = ({
    variant = 'default',
    size = 'md',
    className = '',
    children,
    dot = false,
    ...props
}) => {

    const variants = {
        default: 'bg-muted text-muted-foreground border border-border',
        primary: 'bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20',
        secondary: 'bg-secondary text-secondary-foreground border border-secondary',
        success: 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
        warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
        error: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        info: 'bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
        glass: 'glass text-foreground',
    };

    const dotColors = {
        default: 'bg-muted-foreground',
        primary: 'bg-primary',
        secondary: 'bg-secondary-foreground',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        error: 'bg-red-500',
        info: 'bg-sky-500',
        glass: 'bg-foreground',
    };

    const sizes = {
        sm: 'text-[10px] px-2 py-0.5 rounded-md',
        md: 'text-xs px-2.5 py-1 rounded-lg',
        lg: 'text-sm px-3 py-1.5 rounded-lg',
    };

    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1.5 font-medium',
                variants[variant],
                sizes[size],
                className,
            )}
            {...props}
        >
            {dot && (
                <span
                    aria-hidden="true"
                    className={clsx('inline-block w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
                />
            )}
            {children}
        </span>
    );
};

export default Badge;
