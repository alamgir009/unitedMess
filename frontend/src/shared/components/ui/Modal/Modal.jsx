import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/core/utils/helpers/string.helper';
import { useModalAnimation } from '@/shared/hooks/useModalAnimation';
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

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
  isLoading = false,
}) => {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const { shouldRender, exiting } = useModalAnimation(isOpen, { exitTimeout: 120 });

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-[95vw]',
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

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
      previousFocusRef.current?.focus?.();
    };
  }, [shouldRender, exiting, handleKeyDown]);

  if (typeof document === 'undefined') return null;

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

        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          aria-busy={isLoading}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            className={cn(
              'relative w-full modal-gpu',
              sizes[size],
              'surface-elevated border border-border rounded-xl shadow-lg',
              'focus:outline-none',
              'max-h-[90vh] flex flex-col',
              'modal-animate',
              exiting ? 'modal-exit' : 'modal-enter',
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
                {(title || showCloseButton) && (
                  <div className="flex items-center justify-between p-6 pb-0 flex-shrink-0 depth-top">
                    <div className="min-w-0">
                      {title && (
                        <h2 id="modal-title" className="text-lg font-semibold text-foreground">
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p id="modal-description" className="text-sm text-muted-foreground mt-1">
                          {description}
                        </p>
                      )}
                    </div>
                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="ml-4 shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                <div className="p-6 overflow-y-auto flex-1">
                  {children}
                </div>

                {footer && (
                  <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-4 border-t border-border flex-shrink-0">
                    {footer}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    ) : null,
    document.body,
  );
};

Modal.displayName = 'Modal';
export default Modal;
