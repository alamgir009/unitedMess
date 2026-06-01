import { useEffect } from 'react';

let lockCount = 0;
let scrollY = 0;

export function lockBodyScroll() {
    if (typeof document === 'undefined') return;
    if (lockCount === 0) {
        scrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        document.body.dataset.scrollY = String(scrollY);
    }
    lockCount++;
}

export function unlockBodyScroll() {
    if (typeof document === 'undefined') return;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        delete document.body.dataset.scrollY;
    }
}

/**
 * Locks body scroll while the component is mounted (or `active` is true).
 * Safe for nested modals — uses a global counter.
 *
 * @param {boolean} active — lock while true (default: true when component mounts)
 */
export default function useBodyScrollLock(active = true) {
    useEffect(() => {
        if (!active) return;
        lockBodyScroll();
        return unlockBodyScroll;
    }, [active]);
}
