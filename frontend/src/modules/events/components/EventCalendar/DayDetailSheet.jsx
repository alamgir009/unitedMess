import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';

let lockCount = 0;

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}

const MIN_HEIGHT_PCT = 50;
const MAX_HEIGHT_PCT = 90;

const DayDetailSheet = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [heightPct, setHeightPct] = useState(MIN_HEIGHT_PCT);
  const dragRef = useRef({ startY: 0, startHeight: MIN_HEIGHT_PCT, dragging: false });

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      setHeightPct(MIN_HEIGHT_PCT);
      return;
    }
    previousFocusRef.current = document.activeElement;
    lockBodyScroll();
    document.addEventListener('keydown', handleKeyDown);
    const raf = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      unlockBodyScroll();
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, handleKeyDown]);

  const handleDragStart = useCallback((e) => {
    if (e.target.closest('button')) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { startY: clientY, startHeight: heightPct, dragging: true };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  }, [heightPct]);

  const handleDragMove = useCallback((e) => {
    if (!dragRef.current.dragging) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = dragRef.current.startY - clientY;
    const vh = window.innerHeight;
    const deltaPct = (delta / vh) * 100;
    const newHeight = Math.min(MAX_HEIGHT_PCT, Math.max(MIN_HEIGHT_PCT, dragRef.current.startHeight + deltaPct));
    setHeightPct(newHeight);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragRef.current.dragging = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
    if (heightPct < MIN_HEIGHT_PCT + 5) {
      onClose?.();
    }
  }, [handleDragMove, heightPct, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    isOpen ? (
      <div
        className={cn(
          'fixed inset-0 z-modal',
          'transition-opacity duration-200',
          'bg-[var(--bg-overlay)]',
        )}
      >
        <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
        <div
          className="fixed inset-x-0 bottom-0 z-10 flex items-end justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{ height: `${heightPct}vh` }}
            className={cn(
              'w-full flex flex-col',
              'bg-[var(--bg-elevated)] border border-[var(--border-default)]',
              'rounded-t-2xl shadow-xl shadow-black/10 dark:shadow-black/40',
              'transition-[height] duration-100 ease-out',
              'focus:outline-none',
              'animate-fade-in-up',
            )}
          >
            <div
              className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-[var(--border-default)] shrink-0 cursor-grab active:cursor-grabbing"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-1.5 rounded-full bg-[var(--text-muted)]/40 ring-1 ring-[var(--border-muted)]" aria-hidden="true" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    ) : null,
    document.body,
  );
};

DayDetailSheet.displayName = 'DayDetailSheet';
export default DayDetailSheet;
