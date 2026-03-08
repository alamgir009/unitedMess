import { useState, memo } from 'react';

/**
 * FoodImage
 * Lazy-loads an image and shows an animated shimmer skeleton until ready.
 *
 * Props:
 *   src       {string}  — image URL
 *   alt       {string}  — alt text
 *   className {string}  — extra classes forwarded to <img>
 */
const FoodImage = memo(({ src, alt, className }) => {
    const [loaded, setLoaded] = useState(false);

    return (
        <div className="relative w-full h-full overflow-hidden bg-muted/30">
            {/* Shimmer skeleton shown until image loads */}
            {!loaded && (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
            )}

            <img
                src={src}
                alt={alt}
                loading="lazy"
                decoding="async"
                onLoad={() => setLoaded(true)}
                className={`${className} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ objectFit: 'cover' }}
            />
        </div>
    );
});

FoodImage.displayName = 'FoodImage';

export default FoodImage;