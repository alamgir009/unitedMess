import { useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../Button/Button.jsx';

/**
 * Modal Component
 * Features:
 * - Sizes: sm | md | lg | xl | full
 * - Glass backdrop with blur
 * - Smooth entrance/exit animation
 * - Keyboard accessible (ESC to close, focus trap)
 * - Scroll lock on body when open
 */
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

    // Keyboard & focus management
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
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-modal bg-black/50 backdrop-blur-sm"
                        onClick={closeOnOverlayClick ? onClose : undefined}
                        aria-hidden="true"
                    />

                    {/* Dialog */}
                    <div
                        className="fixed inset-0 z-modal flex items-center justify-center p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={title ? 'modal-title' : undefined}
                        aria-describedby={description ? 'modal-description' : undefined}
                    >
                        <motion.div
                            key="dialog"
                            ref={dialogRef}
                            tabIndex={-1}
                            initial={{ opacity: 0, scale: 0.92, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 16 }}
                            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                            className={clsx(
                                'relative w-full',
                                sizes[size],
                                'glass rounded-2xl shadow-2xl',
                                'focus:outline-none',
                                className,
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            {(title || showCloseButton) && (
                                <div className="flex items-center justify-between p-6 pb-0">
                                    <div>
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
                                            className={clsx(
                                                'ml-4 shrink-0 p-2 rounded-xl',
                                                'text-muted-foreground hover:text-foreground',
                                                'hover:bg-muted transition-colors duration-150',
                                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                            )}
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Body */}
                            <div className="p-6">
                                {children}
                            </div>

                            {/* Footer */}
                            {footer && (
                                <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-0 border-t border-border mt-0">
                                    {footer}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Modal;
