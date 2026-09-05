import { useEffect, useRef } from 'react';

let lockCount = 0;
let scrollY = 0;

export function lockBodyScroll() {
    if (typeof document === 'undefined') return;
    if (lockCount === 0) {
        scrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
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
        document.documentElement.style.overflow = '';
        document.body.style.paddingRight = '';
        delete document.body.dataset.scrollY;
    }
}

function findNearestScrollableParent(element) {
    let el = element?.parentElement;
    while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
            return el;
        }
        el = el.parentElement;
    }
    return null;
}

const lockScroll = (e) => { e.preventDefault(); };

/**
 * Locks body scroll while `active` is true.
 * Safe for nested modals — uses a global counter.
 *
 * @param {boolean} active — lock while true (default: true when component mounts)
 * @param {React.RefObject} [anchorRef] — if provided, also locks the nearest scrollable
 *   ancestor of this element (e.g. a Modal's content div) to prevent iOS scroll-through.
 */
export default function useBodyScrollLock(active = true, anchorRef) {
    const parentRef = useRef(null);

    useEffect(() => {
        if (!active) return;

        // Find and lock nearest scrollable parent of the anchor
        if (anchorRef?.current) {
            parentRef.current = findNearestScrollableParent(anchorRef.current);
            if (parentRef.current) {
                parentRef.current.style.overflow = 'hidden';
                parentRef.current.addEventListener('touchmove', lockScroll, { passive: false });
            }
        }

        lockBodyScroll();

        return () => {
            if (parentRef.current) {
                parentRef.current.removeEventListener('touchmove', lockScroll);
                parentRef.current.style.overflow = '';
                parentRef.current = null;
            }
            unlockBodyScroll();
        };
    }, [active, anchorRef]);
}
