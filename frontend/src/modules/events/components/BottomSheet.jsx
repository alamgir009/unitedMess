import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

const BottomSheet = ({ isOpen, onClose, title, children }) => {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
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

  if (typeof document === 'undefined') return null;

  return createPortal(
    isOpen ? (
      <div
        className={cn(
          'fixed inset-0 z-modal',
          'transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <div
          className="fixed inset-0 bg-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
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
            className={cn(
              'w-full max-h-[85dvh] flex flex-col',
              'surface-elevated border border-border rounded-t-2xl',
              'shadow-xl animate-fade-in-up',
              'focus:outline-none',
            )}
            style={{ animationDuration: '0.25s' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
                <h2 className="text-base font-semibold text-foreground">{title}</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-5">
              {children}
            </div>
          </div>
        </div>
      </div>
    ) : null,
    document.body,
  );
};

BottomSheet.displayName = 'BottomSheet';
export default BottomSheet;
