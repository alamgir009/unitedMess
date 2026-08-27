import { useEffect, useRef, useCallback, useState } from 'react';
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

const MIN_HEIGHT_PCT = 50;
const MAX_HEIGHT_PCT = 90;

const DayDetailSheet = ({
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

  const anyActionActive = isAdding || !!editingId || !!confirmDeleteId;

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
            style={{ height: `${heightPct}vh`, boxShadow: 'var(--shadow-xl), var(--inset-top-glow)' }}
            className={cn(
              'w-full flex flex-col',
              'bg-[var(--bg-elevated)] border border-[var(--border-muted)]',
              'rounded-t-2xl shadow-[var(--shadow-xl)]',
              'transition-[height] duration-100 ease-out',
              'focus:outline-none',
              'animate-fade-in-up',
            )}
          >
            <div
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
              </div>
              <div className="flex items-center justify-between px-5 pt-1 pb-2 border-b border-[var(--border-muted)] shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">{title}</h2>
                </div>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                {category === 'meals' && !isEditMode && onMealAdd ? null : (
                  category === 'markets' && !isEditMode && onEditToggle && onScheduleClick ? null : (
                    category === 'payments' && !isEditMode && onPaymentAdd ? null : (
                      !isEditMode && onEditToggle && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditToggle?.(); }}
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
                      )
                    )
                  )
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
            </div>
            {category === 'meals' && !isEditMode && onMealAdd && (
              <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-muted)]/20 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onMealAdd(); }}
                  aria-label="Add meal entry"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Add Meal
                </button>
              </div>
            )}
            {category === 'markets' && !isEditMode && onEditToggle && onScheduleClick && (
              <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-muted)]/20 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); (onAddMarket || onEditToggle)?.(); }}
                  aria-label="Add market entry"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Market</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onScheduleClick?.(); }}
                  aria-label="Schedule market dates"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--success-text)] hover:bg-[var(--success-bg)] border border-[var(--success-border)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Date</span>
                </button>
              </div>
            )}
            {category === 'payments' && !isEditMode && onPaymentAdd && (
              <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-muted)]/20 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onPaymentAdd(); }}
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

DayDetailSheet.displayName = 'DayDetailSheet';
export default DayDetailSheet;
