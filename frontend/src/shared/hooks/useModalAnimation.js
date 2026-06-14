import { useState, useEffect, useRef } from 'react';

/**
 * useModalAnimation
 *
 * Manages mount/unmount timing for CSS-only modal animations on low-end devices.
 * Eliminates framer-motion JS-driven spring per-frame cost.
 *
 * Timeline:
 *   isOpen=true   → shouldRender=true,  exiting=false → ENTER transition active
 *   isOpen=false  → shouldRender=true,  exiting=true  → EXIT transition active
 *   after timeout → shouldRender=false, exiting=false → unmounted
 *
 * @param {boolean} isOpen
 * @param {object}  [options]
 * @param {number}  [options.exitTimeout=120]  — ms before unmount (match CSS exit duration)
 * @returns {{ shouldRender: boolean, exiting: boolean }}
 */
export function useModalAnimation(isOpen, { exitTimeout = 120 } = {}) {
  const [exiting, setExiting] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      clearTimeout(timerRef.current);
      setExiting(false);
      setShouldRender(true);
    } else {
      setExiting(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        setExiting(false);
      }, exitTimeout);
    }
    return () => clearTimeout(timerRef.current);
  }, [isOpen, exitTimeout]);

  return { shouldRender, exiting };
}
