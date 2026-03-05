import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

const ICONS = {
    success: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    ),
    error: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    warning: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
    ),
    info: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
};

const toastVariantStyles = {
    success: 'border-l-4 border-l-green-500 bg-success-glass dark:bg-green-900/20',
    error: 'border-l-4 border-l-destructive bg-error-glass dark:bg-red-900/20',
    warning: 'border-l-4 border-l-yellow-500 bg-warning-glass dark:bg-yellow-900/20',
    info: 'border-l-4 border-l-sky-500 bg-info-glass dark:bg-sky-900/20',
};

const toastIconStyles = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-destructive',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-sky-600 dark:text-sky-400',
};

// ─── Single Toast ───
const ToastItem = ({ id, type = 'info', title, message, duration = 4000, onRemove }) => {
    const [visible, setVisible] = useState(true);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onRemove(id), 300);
        }, duration);
        return () => clearTimeout(timer);
    }, [id, duration, onRemove, paused]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            role="alert"
            aria-live="polite"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className={clsx(
                'relative flex items-start gap-3 p-4 pr-5',
                'glass rounded-2xl shadow-xl',
                'w-80 max-w-[calc(100vw-2rem)]',
                toastVariantStyles[type],
                'overflow-hidden',
            )}
        >
            {/* Icon */}
            <span className={clsx('shrink-0 mt-0.5', toastIconStyles[type])} aria-hidden="true">
                {ICONS[type]}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
                {message && <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{message}</p>}
            </div>

            {/* Close */}
            <button
                onClick={() => { setVisible(false); setTimeout(() => onRemove(id), 300); }}
                aria-label="Dismiss notification"
                className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Progress bar */}
            {!paused && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted overflow-hidden rounded-b-2xl">
                    <div
                        className={clsx(
                            'h-full animate-[toast-progress_linear_forwards]',
                            type === 'success' ? 'bg-green-500'
                                : type === 'error' ? 'bg-destructive'
                                    : type === 'warning' ? 'bg-yellow-500'
                                        : 'bg-sky-500',
                        )}
                        style={{ animationDuration: `${duration}ms` }}
                    />
                </div>
            )}
        </motion.div>
    );
};

// ─── Toast Container (Portal) ───
export const ToastContainer = ({ toasts = [], onRemove, position = 'bottom-right' }) => {
    const positionStyles = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'top-center': 'top-4 left-1/2 -translate-x-1/2',
        'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    };

    return createPortal(
        <div
            aria-live="polite"
            aria-label="Notifications"
            className={clsx(
                'fixed z-toast flex flex-col gap-3',
                positionStyles[position],
            )}
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} {...toast} onRemove={onRemove} />
                ))}
            </AnimatePresence>
        </div>,
        document.body,
    );
};

// ─── useToast hook ───
export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((opts) => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts((prev) => [...prev, { id, ...opts }]);
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = {
        success: (title, message, opts) => addToast({ type: 'success', title, message, ...opts }),
        error: (title, message, opts) => addToast({ type: 'error', title, message, ...opts }),
        warning: (title, message, opts) => addToast({ type: 'warning', title, message, ...opts }),
        info: (title, message, opts) => addToast({ type: 'info', title, message, ...opts }),
    };

    return { toasts, removeToast, toast };
};

export default ToastItem;
