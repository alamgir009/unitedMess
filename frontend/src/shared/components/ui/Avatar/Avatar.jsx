import { clsx } from 'clsx';

/**
 * Avatar Component
 * Supports: image, initials fallback, placeholder icon fallback
 * Sizes: xs | sm | md | lg | xl | 2xl
 * Variants: circle | rounded
 */
const Avatar = ({
    src,
    alt = '',
    name,
    size = 'md',
    variant = 'circle',
    className = '',
    status,       // online | away | busy | offline
    ...props
}) => {

    const sizes = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-xl',
        '2xl': 'w-20 h-20 text-2xl',
    };

    const statusDotSizes = {
        xs: 'w-1.5 h-1.5',
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3',
        xl: 'w-3.5 h-3.5',
        '2xl': 'w-4 h-4',
    };

    const statusColors = {
        online: 'bg-green-500',
        away: 'bg-yellow-500',
        busy: 'bg-red-500',
        offline: 'bg-gray-400',
    };

    const radiusMap = {
        circle: 'rounded-full',
        rounded: 'rounded-xl',
    };

    // Generate initials from name
    const getInitials = (n) => {
        if (!n) return '?';
        const parts = n.trim().split(/\s+/);
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Generate a consistent background from name
    const colorPalette = [
        'from-blue-500 to-indigo-500',
        'from-violet-500 to-purple-500',
        'from-emerald-500 to-teal-500',
        'from-rose-500 to-pink-500',
        'from-orange-500 to-amber-500',
        'from-cyan-500 to-sky-500',
    ];
    const colorIndex = name
        ? name.charCodeAt(0) % colorPalette.length
        : 0;

    return (
        <div className={clsx('relative inline-block shrink-0', className)} {...props}>
            <span
                className={clsx(
                    'flex items-center justify-center overflow-hidden',
                    'bg-muted font-semibold text-foreground',
                    sizes[size],
                    radiusMap[variant],
                )}
                aria-label={alt || name}
                role={alt || name ? 'img' : undefined}
            >
                {src ? (
                    <img
                        src={src}
                        alt={alt || name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        width="40"
                        height="40"
                    />
                ) : name ? (
                    <span className={clsx(
                        'w-full h-full flex items-center justify-center text-white font-bold',
                        `bg-gradient-to-br ${colorPalette[colorIndex]}`,
                    )}>
                        {getInitials(name)}
                    </span>
                ) : (
                    /* Placeholder user icon */
                    <svg className="w-1/2 h-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M7.5 6.5C7.5 8.981 9.519 11 12 11s4.5-2.019 4.5-4.5S14.481 2 12 2 7.5 4.019 7.5 6.5zM20 21h1v-1c0-3.859-3.141-7-7-7h-4c-3.86 0-7 3.141-7 7v1h17z" />
                    </svg>
                )}
            </span>

            {status && (
                <span
                    aria-label={status}
                    className={clsx(
                        'absolute bottom-0 right-0 rounded-full ring-2 ring-background',
                        statusDotSizes[size],
                        statusColors[status],
                    )}
                />
            )}
        </div>
    );
};

export default Avatar;
