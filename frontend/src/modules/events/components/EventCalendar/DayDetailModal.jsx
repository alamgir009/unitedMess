import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil } from 'lucide-react';
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

const DayDetailModal = ({
  isOpen,
  onClose,
  title,
  children,
  isEditMode = false,
  onEditToggle,
}) => {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      previousFocusRef.current?.focus?.();
      unlockBodyScroll();
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
    };
  }, [isOpen, handleKeyDown]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    isOpen ? (
      <div
        className={cn(
          'fixed inset-0 z-modal',
          'transition-opacity duration-[180ms] ease-out',
          'bg-[var(--bg-overlay)]',
        )}
      >
        <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
        <div
          className="fixed inset-0 z-10 flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'w-full max-w-lg flex flex-col',
              'bg-[var(--bg-elevated)] border border-[var(--border-default)]',
              'rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40',
              'focus:outline-none',
              'animate-fade-in-up',
              'max-h-[85vh]',
            )}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border-default)] shrink-0">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
              <div className="flex items-center gap-1">
                {!isEditMode && (
                  <button
                    onClick={onEditToggle}
                    aria-label="Edit entries"
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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

DayDetailModal.displayName = 'DayDetailModal';
export default DayDetailModal;
