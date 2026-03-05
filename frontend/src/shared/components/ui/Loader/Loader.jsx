import { clsx } from 'clsx';

/**
 * Loader Component
 * Variants: spinner | dots | pulse | skeleton
 * Sizes: xs | sm | md | lg | xl
 */

// ─── Spinner ───
export const Spinner = ({ size = 'md', className = '', color = 'primary', ...props }) => {
    const sizes = {
        xs: 'w-3 h-3 border-[2px]',
        sm: 'w-4 h-4 border-2',
        md: 'w-6 h-6 border-2',
        lg: 'w-8 h-8 border-[3px]',
        xl: 'w-12 h-12 border-4',
    };
    const colors = {
        primary: 'border-primary/20 border-t-primary',
        white: 'border-white/20 border-t-white',
        current: 'border-current/20 border-t-current',
    };
    return (
        <span
            role="status"
            aria-label="Loading"
            className={clsx(
                'inline-block rounded-full animate-spin',
                sizes[size],
                colors[color],
                className,
            )}
            {...props}
        />
    );
};

// ─── Dots ───
export const DotsLoader = ({ size = 'md', className = '', ...props }) => {
    const dotSizes = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-3 h-3' };
    return (
        <span
            role="status"
            aria-label="Loading"
            className={clsx('inline-flex items-center gap-1.5', className)}
            {...props}
        >
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    style={{ animationDelay: `${i * 150}ms` }}
                    className={clsx(
                        'rounded-full bg-primary inline-block',
                        'animate-bounce',
                        dotSizes[size] ?? dotSizes.md,
                    )}
                />
            ))}
            <span className="sr-only">Loading…</span>
        </span>
    );
};

// ─── Pulse ───
export const PulseLoader = ({ className = '', ...props }) => (
    <span
        role="status"
        aria-label="Loading"
        className={clsx(
            'inline-block w-10 h-10 rounded-full bg-primary/40 animate-ping',
            className,
        )}
        {...props}
    >
        <span className="sr-only">Loading…</span>
    </span>
);

// ─── Skeleton ───
export const Skeleton = ({ className = '', as: Tag = 'div', ...props }) => (
    <Tag
        aria-hidden="true"
        className={clsx(
            'relative overflow-hidden rounded-lg bg-muted',
            'before:absolute before:inset-0 before:bg-gradient-to-r',
            'before:from-transparent before:via-white/20 before:to-transparent',
            'before:animate-shimmer',
            className,
        )}
        {...props}
    />
);

// ─── Default export — convenience wrapper ───
const Loader = ({ variant = 'spinner', ...props }) => {
    if (variant === 'dots') return <DotsLoader {...props} />;
    if (variant === 'pulse') return <PulseLoader {...props} />;
    if (variant === 'skeleton') return <Skeleton {...props} />;
    return <Spinner {...props} />;
};

export default Loader;
