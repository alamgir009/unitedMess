import { memo } from 'react';
import { HiOutlineStar } from 'react-icons/hi2';

/**
 * Stars
 * Renders a 5-star rating row with filled stars up to Math.floor(rating).
 *
 * Props:
 *   rating {number} — e.g. 4.8
 */
const Stars = memo(({ rating }) => (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rating: ${rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
            <HiOutlineStar
                key={i}
                className={`w-3 h-3 ${
                    i < Math.floor(rating)
                        ? 'text-amber-400'
                        : 'text-border'
                }`}
                style={i < Math.floor(rating) ? { fill: 'currentColor' } : {}}
            />
        ))}
        <span className="ml-1 text-xs font-semibold text-foreground">{rating}</span>
    </span>
));

Stars.displayName = 'Stars';

export default Stars;