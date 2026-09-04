import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/core/utils/helpers/string.helper';
import { useModalAnimation } from '@/shared/hooks/useModalAnimation';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { Spinner } from '@/shared/components/ui';

let lockCount = 0;

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  lockCount++;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

const accentColors = {
  blue: 'from-[var(--brand)] to-[var(--brand-hover)]',
  emerald: 'from-emerald-500 to-emerald-600',
  red: 'from-rose-500 via-red-400 to-orange-400',
  amber: 'from-amber-500 to-orange-400',
  none: 'hidden',
};

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[95vw]',
};

const SHEET_MIN_HEIGHT_PCT = 50;
const SHEET_MAX_HEIGHT_PCT = 90;
const SHEET_DEFAULT_HEIGHT_PCT = 75;
const SHEET_DISMISS_THRESHOLD = SHEET_MIN_HEIGHT_PCT + 5;

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  accentColor = 'blue',
  mobileSheet = false,
  role = 'dialog',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
  isLoading = false,
}) => {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const { shouldRender, exiting } = useModalAnimation(isOpen, { exitTimeout: 120 });
  const isMobile = useMediaQuery('(max-width: 639px)');
  const useSheet = mobileSheet && isMobile;

  const [sheetHeightPct, setSheetHeightPct] = useState(SHEET_DEFAULT_HEIGHT_PCT);
  const dragRef = useRef({ startY: 0, startHeight: SHEET_DEFAULT_HEIGHT_PCT, dragging: false });

  useEffect(() => {
    if (useSheet && isOpen) {
      setSheetHeightPct(SHEET_DEFAULT_HEIGHT_PCT);
    }
  }, [useSheet, isOpen]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose?.();
      return;
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusable = Array.from(dialogRef.current.querySelectorAll(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }, [onClose]);

  const handleDragMove = useCallback((e) => {
    if (!dragRef.current.dragging) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = dragRef.current.startY - clientY;
    const vh = window.innerHeight;
    const deltaPct = (delta / vh) * 100;
    const newHeight = Math.min(
      SHEET_MAX_HEIGHT_PCT,
      Math.max(SHEET_MIN_HEIGHT_PCT, dragRef.current.startHeight + deltaPct),
    );
    setSheetHeightPct(newHeight);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragRef.current.dragging = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
    if (sheetHeightPct < SHEET_DISMISS_THRESHOLD) {
      onClose?.();
    }
  }, [handleDragMove, sheetHeightPct, onClose]);

  const handleDragStart = useCallback((e) => {
    if (e.target.closest('button')) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { startY: clientY, startHeight: sheetHeightPct, dragging: true };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  }, [sheetHeightPct, handleDragMove, handleDragEnd]);

  useEffect(() => {
    if (!shouldRender || exiting) return;
    previousFocusRef.current = document.activeElement;

    lockBodyScroll();
    document.addEventListener('keydown', handleKeyDown);

    const raf = requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      cancelAnimationFrame(raf);
      unlockBodyScroll();
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
      previousFocusRef.current?.focus?.();
    };
  }, [shouldRender, exiting, handleKeyDown, handleDragMove, handleDragEnd]);

  if (typeof document === 'undefined') return null;

  const accentBar = accentColors[accentColor] || accentColors.blue;

  const dialogContent = (
    <div
      ref={dialogRef}
      role={role}
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
      aria-busy={isLoading || undefined}
      tabIndex={-1}
      style={useSheet ? { height: `${sheetHeightPct}vh`, boxShadow: 'var(--shadow-xl), var(--inset-top-glow)' } : undefined}
      className={cn(
        'relative w-full modal-gpu',
        !useSheet && sizeMap[size],
        'surface-elevated border border-border',
        'focus:outline-none',
        'flex flex-col',
        useSheet
          ? 'rounded-t-2xl shadow-[var(--shadow-xl)] animate-fade-in-up transition-[height] duration-100 ease-out'
          : 'rounded-xl shadow-xl modal-animate sm:rounded-xl',
        exiting && !useSheet && 'modal-exit',
        !exiting && !useSheet && 'modal-enter',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Spinner size="xl" />
        </div>
      ) : (
        <>
          {useSheet && (
            <div
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              className="shrink-0 cursor-grab active:cursor-grabbing"
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 rounded-full bg-border-strong" />
              </div>
            </div>
          )}

          {(title || showCloseButton) && (
            <div className={cn(
              'flex items-center justify-between flex-shrink-0 border-b border-border-default',
              useSheet ? 'px-5 pt-1 pb-2' : 'px-5 py-4 sm:px-6 sm:py-5',
            )}>
              <div className="flex items-center gap-3 min-w-0">
                {accentColor !== 'none' && (
                  <div className={cn('w-1 h-6 rounded-full bg-gradient-to-b shrink-0', accentBar)} />
                )}
                <div className="min-w-0">
                  {title && (
                    <h2 id="modal-title" className={cn(
                      'truncate font-semibold text-foreground',
                      useSheet ? 'text-sm sm:text-base' : 'text-base sm:text-lg',
                    )}>
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id="modal-description" className="text-sm text-muted-foreground mt-0.5">
                      {description}
                    </p>
                  )}
                </div>
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="ml-4 shrink-0 p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          <div className={cn(
            'relative z-10 flex-1 overflow-y-auto overscroll-contain',
            useSheet ? 'px-5 py-4' : 'px-5 py-4 sm:px-6 sm:py-5',
            '[scrollbar-width:thin] [scrollbar-color:var(--border-strong)_transparent]',
            '[&::-webkit-scrollbar]:w-1.5',
            '[&::-webkit-scrollbar-track]:bg-transparent',
            '[&::-webkit-scrollbar-thumb]:bg-[var(--border-strong)] [&::-webkit-scrollbar-thumb]:rounded-full',
            '[&::-webkit-scrollbar-thumb:hover]:bg-[var(--text-muted)]',
            '[-webkit-overflow-scrolling:touch]',
          )}>
            {children}
          </div>

          {footer && (
            <div className={cn(
              'flex items-center justify-end gap-3 flex-shrink-0 border-t border-border-default',
              useSheet ? 'px-5 pb-4 pt-3' : 'px-5 pb-5 pt-3 sm:px-6 sm:pb-6 sm:pt-4',
            )}>
              {footer}
            </div>
          )}
        </>
      )}
    </div>
  );

  if (useSheet) {
    return createPortal(
      shouldRender ? (
        <div
          className={cn(
            'fixed inset-0 z-modal',
            'modal-animate-backdrop',
            exiting ? 'modal-exit-backdrop' : 'modal-enter'
          )}
          style={{ pointerEvents: exiting ? 'none' : 'auto' }}
        >
          <div
            className="fixed inset-0 bg-overlay"
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-hidden="true"
          />

          <div className="fixed inset-x-0 bottom-0 z-10 flex items-end justify-center">
            {dialogContent}
          </div>
        </div>
      ) : null,
      document.body,
    );
  }

  return createPortal(
    shouldRender ? (
      <div
        className={cn(
          'fixed inset-0 z-modal',
          'modal-animate-backdrop',
          exiting ? 'modal-exit-backdrop' : 'modal-enter'
        )}
        style={{ pointerEvents: exiting ? 'none' : 'auto' }}
      >
        <div
          className="fixed inset-0 bg-overlay"
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          {dialogContent}
        </div>
      </div>
    ) : null,
    document.body,
  );
};

Modal.displayName = 'Modal';
export default Modal;
