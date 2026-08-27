import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil, Plus, Calendar, CreditCard } from 'lucide-react';
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
  category,
  onScheduleClick,
  onPaymentAdd,
  onAddMarket,
  onMealAdd,
  isAdding = false,
  editingId = null,
  confirmDeleteId = null,
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

  const showMealActions = category === 'meals' && !isEditMode && onMealAdd;
  const showMarketActions = category === 'markets' && !isEditMode && onEditToggle && onScheduleClick;
  const showPaymentActions = category === 'payments' && !isEditMode && onPaymentAdd;
  const anyActionActive = isAdding || !!editingId || !!confirmDeleteId;

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
              'bg-[var(--bg-elevated)] border border-[var(--border-muted)]',
              'rounded-2xl shadow-[var(--shadow-xl)]',
              'focus:outline-none',
              'animate-fade-in-up',
              'max-h-[85vh]',
            )}
            style={{ boxShadow: 'var(--shadow-xl), var(--inset-top-glow)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border-muted)] shrink-0">
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate min-w-0">{title}</h2>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                {!isEditMode && onEditToggle && !showMealActions && !showMarketActions && !showPaymentActions && (
                  <button
                    onClick={onEditToggle}
                    disabled={anyActionActive}
                    aria-label="Edit entries"
                    className={cn(
                      'p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      anyActionActive
                        ? 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                        : 'text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10',
                    )}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {showMealActions && (
              <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-muted)]/20 shrink-0">
                <button
                  onClick={onMealAdd}
                  aria-label="Add meal entry"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Add Meal
                </button>
              </div>
            )}
            {showMarketActions && (
              <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-muted)]/20 shrink-0">
                <button
                  onClick={onAddMarket || onEditToggle}
                  aria-label="Add market entry"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Market</span>
                </button>
                <button
                  onClick={onScheduleClick}
                  aria-label="Schedule market dates"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--success-text)] hover:bg-[var(--success-bg)] border border-[var(--success-border)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Date</span>
                </button>
              </div>
            )}
            {showPaymentActions && (
              <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-muted)]/20 shrink-0">
                <button
                  onClick={onPaymentAdd}
                  aria-label="Add payment"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Add Payment</span>
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4
              [scrollbar-width:thin] [scrollbar-color:var(--border-strong)_transparent]
              [&::-webkit-scrollbar]:w-1.5
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:bg-[var(--border-strong)] [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb:hover]:bg-[var(--text-muted)]
            ">
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
