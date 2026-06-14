import { useState, useEffect } from 'react';

/**
 * SSR-safe media query hook.
 * Returns `true` when the query matches, `false` otherwise.
 *
 * @param {string} query — e.g. '(max-width: 767px)'
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const getMatches = () =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false;

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);

    setMatches(mql.matches);

    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, [query]);

  return matches;
}
