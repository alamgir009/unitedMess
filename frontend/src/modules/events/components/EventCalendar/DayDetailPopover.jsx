import { useRef, useEffect, useCallback, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';

function calcPosition(anchorRect, popupWidth, popupHeight, vw, vh) {
  const gap = 10;
  let top, left, placement;

  const fitsBelow = anchorRect.bottom + popupHeight + gap <= vh;
  const fitsAbove = anchorRect.top - popupHeight - gap >= 0;

  if (fitsBelow) {
    placement = 'bottom';
    top = anchorRect.bottom + gap;
  } else if (fitsAbove) {
    placement = 'top';
    top = anchorRect.top - popupHeight - gap;
  } else {
    placement = 'bottom';
    top = Math.min(anchorRect.bottom + gap, vh - popupHeight - gap);
  }

  left = Math.max(gap, Math.min(anchorRect.left + (anchorRect.width - popupWidth) / 2, vw - popupWidth - gap));

  return { top, left, placement };
}

const POPUP_WIDTH = 280;
const POPUP_MAX_HEIGHT = 360;

const DayDetailPopover = ({
  isOpen,
  onClose,
  title,
  children,
  anchorRect,
}) => {
  const popupRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [phase, setPhase] = useState('closed'); // 'closed' | 'entering' | 'open' | 'exiting'

  // Sync phase with isOpen
  useEffect(() => {
    if (isOpen) {
      setPhase('entering');
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('open')));
    } else if (phase === 'open' || phase === 'entering') {
      setPhase('exiting');
      const t = setTimeout(() => setPhase('closed'), 180);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Recalculate position synchronously whenever anchorRect changes
  useLayoutEffect(() => {
    if (!anchorRect) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPosition(calcPosition(anchorRect, POPUP_WIDTH, POPUP_MAX_HEIGHT, vw, vh));
  }, [anchorRect]);

  // Focus + keyboard
  useEffect(() => {
    if (phase !== 'open') return;
    previousFocusRef.current = document.activeElement;
    const raf = requestAnimationFrame(() => popupRef.current?.focus());
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [phase]);

  const handleClose = useCallback(() => {
    setPhase('exiting');
    setTimeout(() => {
      setPhase('closed');
      onClose?.();
    }, 180);
  }, [onClose]);

  if (phase === 'closed') return null;

  const isVisible = phase === 'open' || phase === 'entering';
  const isBelow = position.placement === 'bottom';

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-modal',
        'transition-opacity duration-[180ms] ease-out',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
      aria-hidden="true"
    >
      <div className="fixed inset-0" onClick={handleClose} aria-hidden="true" />
      <div
        ref={popupRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-placement={position.placement}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          width: POPUP_WIDTH,
          maxHeight: POPUP_MAX_HEIGHT,
          transformOrigin: isBelow ? 'top center' : 'bottom center',
        }}
        className={cn(
          'flex flex-col',
          'bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl',
          'shadow-xl shadow-black/8 dark:shadow-black/30',
          'focus:outline-none',
          'transition-all duration-[180ms] cubic-bezier(0.16,1,0.3,1)',
          'after:absolute after:w-3 after:h-3 after:rotate-45 after:bg-[var(--bg-elevated)] after:border after:border-[var(--border-default)]',
          'after:pointer-events-none after:z-[-1]',
          'data-[placement=bottom]:after:-top-[6.5px] data-[placement=bottom]:after:left-1/2 data-[placement=bottom]:after:-translate-x-1/2 data-[placement=bottom]:after:border-b-0 data-[placement=bottom]:after:border-r-0',
          'data-[placement=top]:after:-bottom-[6.5px] data-[placement=top]:after:left-1/2 data-[placement=top]:after:-translate-x-1/2 data-[placement=top]:after:border-t-0 data-[placement=top]:after:border-l-0',
          isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : cn('opacity-0 scale-95 pointer-events-none', isBelow ? 'translate-y-[-6px]' : 'translate-y-[6px]'),
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] shrink-0 bg-[var(--bg-muted)]/30">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-3">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

DayDetailPopover.displayName = 'DayDetailPopover';
export default DayDetailPopover;
