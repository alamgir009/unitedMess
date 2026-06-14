import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useModalAnimation } from '@/shared/hooks/useModalAnimation';
import { cn } from '@/core/utils/helpers/string.helper';
import { HiOutlineXMark } from 'react-icons/hi2';

const PaymentModal = ({ isOpen, onClose, title, children }) => {
  const { shouldRender, exiting } = useModalAnimation(isOpen, { exitTimeout: 120 });

  useEffect(() => {
    if (!shouldRender || exiting) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', esc);
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
            role="dialog"
            aria-modal="true"
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
