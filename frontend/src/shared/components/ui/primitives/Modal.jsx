import { useEffect, useLayoutEffect, useRef, useCallback, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/core/utils/helpers/string.helper';
import { useModalAnimation } from '@/shared/hooks/useModalAnimation';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { lockBodyScroll, unlockBodyScroll } from '@/shared/hooks/useBodyScrollLock';
import { Spinner } from '@/shared/components/ui';

// Global stack to ensure only the topmost dialog responds to Escape
const activeModalStack = [];

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[95vw]',
};

const accentColors = {
  blue: 'from-[var(--brand)] to-[var(--brand-hover)]',
  emerald: 'from-[var(--success)] to-[var(--success-text)]',
  red: 'from-[var(--danger)] to-[var(--danger-text)]',
  amber: 'from-[var(--warning)] to-[var(--warning-text)]',
  none: 'hidden',
};

const SHEET_MIN_HEIGHT_PCT = 50;
const SHEET_MAX_HEIGHT_PCT = 90;
const SHEET_DEFAULT_HEIGHT_PCT = 75;
const SHEET_DISMISS_THRESHOLD = SHEET_MIN_HEIGHT_PCT + 5;

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  ariaLabelledBy,
  ariaDescribedBy,
  children,
  footer,
  headerContent,
  size = 'md',
  accentColor = 'blue',
  mobileSheet = false,
  role = 'dialog',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
  isLoading = false,
  isBusy = false,
  desktopMaxHeight = '92dvh',
}) => {
  const reactId = useId().replace(/:/g, '');
  const titleId = `modal-title-${reactId}`;
  const descId = `modal-desc-${reactId}`;
  const modalInstanceId = useRef(`modal-${reactId}-${Math.random().toString(36).slice(2, 7)}`).current;

  const onCloseRef = useRef(onClose);
  const busyRef = useRef(isBusy);
  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = isBusy;
  });
  const requestClose = useCallback(() => {
    if (!busyRef.current) onCloseRef.current?.();
  }, []);

  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const { shouldRender, exiting } = useModalAnimation(isOpen, { exitTimeout: 180 });
  const isMobile = useMediaQuery('(max-width: 639px)');
  const useSheet = mobileSheet && isMobile;

  const [sheetHeightPct, setSheetHeightPct] = useState(SHEET_DEFAULT_HEIGHT_PCT);
  useLayoutEffect(() => {
    if (!shouldRender) return;
    const dialog = dialogRef.current;
    openerRef.current = document.activeElement;
    return () => {
      const opener = openerRef.current;
      const active = document.activeElement;
      if (opener?.isConnected && (active === document.body || dialog?.contains(active))) {
        opener.focus({ preventScroll: true });
      }
      openerRef.current = null;
    };
  }, [shouldRender]);

  useLayoutEffect(() => {
    if (isOpen && isBusy) dialogRef.current?.focus({ preventScroll: true });
  }, [isOpen, isBusy, shouldRender]);

  useEffect(() => {
    if (useSheet && isOpen) {
      setSheetHeightPct(SHEET_DEFAULT_HEIGHT_PCT);
    }
  }, [useSheet, isOpen]);

  const handleKeyDown = useCallback((e) => {
    // Only topmost modal handles Escape
    if (e.key === 'Escape') {
      const topModalId = activeModalStack[activeModalStack.length - 1];
      if (topModalId !== modalInstanceId) return;

      if (document.querySelector('[role="listbox"]:not([aria-hidden="true"]), [role="menu"]:not([aria-hidden="true"])')) {
        return;
      }
      e.stopPropagation();
      requestClose();
      return;
    }

    const dialog = dialogRef.current;
    if (e.key === 'Tab' && dialog && activeModalStack.at(-1) === modalInstanceId) {
      if (busyRef.current) {
        e.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }
      const focusableSelector =
        'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]';
      const focusable = Array.from(dialog.querySelectorAll(focusableSelector)).filter((element) =>
        element.tabIndex >= 0 &&
        !element.matches(':disabled') &&
        !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
        (element.checkVisibility?.({ visibilityProperty: true }) ?? true),
      );
      if (focusable.length === 0) {
        e.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1);
      const active = document.activeElement;
      if (!focusable.includes(active) || active === (e.shiftKey ? first : last)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    }
  }, [modalInstanceId, requestClose]);

  const dragRef = useRef(null);
  const heightFromPointer = (e, drag) => Math.min(
      SHEET_MAX_HEIGHT_PCT,
      Math.max(SHEET_MIN_HEIGHT_PCT, drag.startHeight + (drag.startY - e.clientY) / window.innerHeight * 100),
  );
  const handleDragStart = (e) => {
    if (isBusy || e.button !== 0 || dragRef.current) return;
    dragRef.current = { pointerId: e.pointerId, startY: e.clientY, startHeight: sheetHeightPct };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleDragMove = (e) => {
    const drag = dragRef.current;
    if (drag?.pointerId === e.pointerId) setSheetHeightPct(heightFromPointer(e, drag));
  };
  const handleDragEnd = (e) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (e.type !== 'pointerup') {
      setSheetHeightPct(drag.startHeight);
    } else if (heightFromPointer(e, drag) < SHEET_DISMISS_THRESHOLD) {
      requestClose();
    }
  };

  useEffect(() => {
    if (!shouldRender || exiting) return;

    activeModalStack.push(modalInstanceId);
    lockBodyScroll();
    document.addEventListener('keydown', handleKeyDown);

    // Autofocus the first enabled field if nothing inside dialog is already focused
    const raf = requestAnimationFrame(() => {
      if (!dialogRef.current) return;
      if (dialogRef.current.contains(document.activeElement)) return;

      const enabledInputs = dialogRef.current.querySelectorAll(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
      );
      if (enabledInputs.length > 0) {
        enabledInputs[0].focus();
      } else {
        const allFocusable = dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        if (allFocusable.length > 0) {
          allFocusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      const stackIdx = activeModalStack.lastIndexOf(modalInstanceId);
      if (stackIdx !== -1) activeModalStack.splice(stackIdx, 1);

      unlockBodyScroll();
      document.removeEventListener('keydown', handleKeyDown);
      dragRef.current = null;
    };
  }, [shouldRender, exiting, modalInstanceId, handleKeyDown]);

  if (typeof document === 'undefined' || !shouldRender) return null;

  const accentBar = accentColors[accentColor] || accentColors.blue;

  const dialogContent = (
    <div
      ref={dialogRef}
      role={role}
      aria-modal="true"
      aria-labelledby={ariaLabelledBy || (title ? titleId : undefined)}
      aria-describedby={ariaDescribedBy || (description && (title || headerContent) ? descId : undefined)}
      aria-busy={isLoading || isBusy || undefined}
      tabIndex={-1}
      style={
        useSheet
          ? {
              maxHeight: '90dvh',
              height: `${sheetHeightPct}dvh`,
              boxShadow: 'var(--elevation-4, var(--shadow-xl))',
            }
          : { maxHeight: desktopMaxHeight }
      }
      className={cn(
        'relative w-full modal-gpu',
        !useSheet && sizeMap[size],
        'bg-[var(--bg-elevated)] border border-[var(--border-default)]',
        'focus:outline-none flex flex-col overflow-hidden',
        useSheet
          ? 'rounded-t-[var(--radius-2xl)] shadow-xl animate-fade-in-up'
          : 'rounded-[var(--radius-xl)] shadow-xl modal-animate',
        exiting && !useSheet && 'modal-exit',
        !exiting && !useSheet && 'modal-enter',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {useSheet && (
        <div
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onLostPointerCapture={handleDragEnd}
          className="relative z-20 shrink-0 cursor-grab active:cursor-grabbing bg-transparent py-2 flex items-center justify-center touch-none"
        >
          <div className="w-10 h-1.5 rounded-full bg-[var(--text-disabled)] opacity-80" />
        </div>
      )}

      {/* Header */}
      {(title || headerContent) && (
        <div
          data-modal-header="true"
          className="flex items-center justify-between shrink-0 border-b border-[var(--border-default)] px-5 py-4 sm:px-6 sm:py-5"
        >
          <div className="flex items-center gap-3 min-w-0">
            {accentColor !== 'none' && (
              <div
                className={cn(
                  'w-1 h-6 rounded-full bg-gradient-to-b shrink-0',
                  accentBar,
                )}
              />
            )}
            <div className="min-w-0">
              {title && (
                <h2
                  id={titleId}
                  className="truncate font-semibold text-[var(--text-primary)] text-base sm:text-lg"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            {headerContent}
            {showCloseButton && (
              <button
                type="button"
                onClick={requestClose}
                disabled={isBusy}
                aria-label="Close dialog"
                className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-width,2px)] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div
        data-modal-body="true"
        className={cn(
          'relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain',
          useSheet ? 'px-4 py-3' : 'px-5 py-4 sm:px-6 sm:py-5',
          '[scrollbar-width:thin] [scrollbar-color:var(--border-strong)_transparent]',
        )}
      >
        {isLoading ? (
          <div
            className="flex min-h-[220px] items-center justify-center py-10"
            role="status"
            aria-live="polite"
          >
            <Spinner size="xl" />
          </div>
        ) : (
          children
        )}
      </div>

      {/* Footer */}
      {footer && (
        <div
          data-modal-footer="true"
          className={cn(
            'flex items-center justify-end gap-3 shrink-0 border-t border-[var(--border-default)] px-5 pt-3 sm:px-6 sm:pb-6 sm:pt-4',
            useSheet ? 'pb-[max(1.25rem,env(safe-area-inset-bottom))]' : 'pb-5',
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[var(--z-modal,400)] modal-gpu',
        useSheet ? 'flex flex-col justify-end' : 'flex items-center justify-center p-4 sm:p-6',
      )}
      onClick={closeOnOverlayClick ? requestClose : undefined}
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[var(--bg-overlay)] transition-opacity duration-150"
      />
      {dialogContent}
    </div>,
    document.body,
  );
};

Modal.displayName = 'Modal';
export default Modal;
