import { forwardRef } from 'react';
import { clsx } from 'clsx';

/**
 * Card Component
 * Variants: default | glass | elevated | flat | bordered
 * Padding options: none | sm | md | lg | xl
 */
const Card = forwardRef(({
    variant = 'default',
    padding = 'md',
    className = '',
    children,
    hover = false,
    ...props
}, ref) => {

    const variants = {
        default: [
            'bg-card text-card-foreground',
            'border border-border',
            'shadow-md rounded-2xl',
        ],
        glass: [
            'glass text-foreground',
            'rounded-2xl',
        ],
        elevated: [
            'bg-card text-card-foreground',
            'border border-border',
            'shadow-xl rounded-2xl',
        ],
        flat: [
            'bg-muted/50 text-foreground',
            'rounded-2xl',
        ],
        bordered: [
            'bg-transparent text-foreground',
            'border-2 border-border',
            'rounded-2xl',
        ],
    };

    const paddings = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
    };

    const hoverStyles = hover ? [
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:shadow-lg',
        'cursor-pointer',
    ] : [];

    return (
        <div
            ref={ref}
            className={clsx(variants[variant], paddings[padding], hoverStyles, className)}
            {...props}
        >
            {children}
        </div>
    );
});

Card.displayName = 'Card';

/**
 * CardHeader — top section of the card
 */
export const CardHeader = ({ className = '', children, ...props }) => (
    <div className={clsx('flex flex-col space-y-1.5 pb-4', className)} {...props}>
        {children}
    </div>
);

/**
 * CardTitle — heading within CardHeader
 */
export const CardTitle = ({ className = '', children, ...props }) => (
    <h3 className={clsx('font-semibold leading-none tracking-tight text-lg', className)} {...props}>
        {children}
    </h3>
);

/**
 * CardDescription — subtitle within CardHeader
 */
export const CardDescription = ({ className = '', children, ...props }) => (
    <p className={clsx('text-sm text-muted-foreground', className)} {...props}>
        {children}
    </p>
);

/**
 * CardContent — body of the card
 */
export const CardContent = ({ className = '', children, ...props }) => (
    <div className={clsx('', className)} {...props}>
        {children}
    </div>
);

/**
 * CardFooter — bottom section of the card
 */
export const CardFooter = ({ className = '', children, ...props }) => (
    <div className={clsx('flex items-center pt-4 border-t border-border mt-4', className)} {...props}>
        {children}
    </div>
);

export default Card;
