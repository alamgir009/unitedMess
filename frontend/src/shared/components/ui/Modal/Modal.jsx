import { useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '@/shared/components/ui';

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
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => dialogRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-modal bg-overlay backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-hidden="true"
          />

          <div
            className="fixed inset-0 z-modal flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
            aria-busy={isLoading}
          >
            <motion.div
              key="dialog"
              ref={dialogRef}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
              className={clsx(
                'relative w-full',
                sizes[size],
                'bg-card border border-border rounded-xl shadow-xl',
                'focus:outline-none',
                'max-h-[90vh] flex flex-col',
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
                    <div className="flex items-center justify-between p-6 pb-0 flex-shrink-0">
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
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
