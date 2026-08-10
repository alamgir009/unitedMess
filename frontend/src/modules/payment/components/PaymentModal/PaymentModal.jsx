import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalAnimation } from '@/shared/hooks/useModalAnimation';
import { cn } from '@/core/utils/helpers/string.helper';
import { HiOutlineXMark } from 'react-icons/hi2';

const PaymentModal = ({ isOpen, onClose, title, children }) => {
  const { shouldRender, exiting } = useModalAnimation(isOpen, { exitTimeout: 120 });
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!shouldRender || exiting) return;
    previousFocusRef.current = document.activeElement;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const dialog = dialogRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => dialog ? Array.from(dialog.querySelectorAll(focusableSelector)) : [];

    // Focus first element
    requestAnimationFrame(() => {
      const focusable = getFocusable();
      if (focusable.length > 0) focusable[0]?.focus();
      else dialog?.focus();
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [shouldRender, exiting, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    shouldRender ? (
      <div
        className={cn(
          'fixed inset-0 z-[1000]',
          'modal-animate-backdrop',
          exiting ? 'modal-exit-backdrop' : 'modal-enter'
        )}
        style={{ pointerEvents: exiting ? 'none' : 'auto' }}
      >
        <button
          aria-label="Close modal"
          onClick={onClose}
          className="absolute inset-0 w-full h-full bg-black/60 md:bg-black/50"
        />

        <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className={cn(
              'relative w-full max-w-lg overflow-hidden rounded-3xl',
              'border border-black/10 dark:border-white/10',
              'bg-white dark:bg-slate-900 text-slate-900 dark:text-white',
              'shadow-2xl',
              'md:bg-white/95 md:dark:bg-slate-900/95',
              'modal-animate modal-gpu',
              exiting ? 'modal-exit' : 'modal-enter'
            )}
          >
            <div className="
              relative z-10 flex items-center justify-between
              px-4 py-4 sm:px-6 sm:py-5
              border-b border-black/10 dark:border-white/10
            ">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-1 h-6 rounded-full bg-gradient-to-b from-sky-500 to-violet-600" />
                <h2 className="truncate text-lg font-semibold">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close modal"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="
              relative z-10 px-4 py-4 sm:px-6 sm:py-5
              max-h-[82dvh] overflow-y-auto
            ">
              {children}
            </div>
          </div>
        </div>
      </div>
    ) : null,
    document.body
  );
};

export default PaymentModal;
