import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/core/utils/helpers/string.helper';

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
  success: 'border-l-4 border-l-success bg-success-bg',
  error: 'border-l-4 border-l-danger bg-danger-bg',
  warning: 'border-l-4 border-l-warning bg-warning-bg',
  info: 'border-l-4 border-l-info bg-info-bg',
};

const toastIconStyles = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};

const progressBarColors = {
  success: 'bg-success',
  error: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
};

const ToastItem = ({ id, type = 'info', title, message, duration = 4000, onRemove }) => {
ToastItem.displayName = 'ToastItem';
  const [paused, setPaused] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onRemove(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onRemove, paused]);

  return (
    <motion.div
      layout
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      role="alert"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        'relative flex items-start gap-3 p-4 pr-5',
        'bg-card border border-border rounded-lg shadow-xl',
        'w-80 max-w-[calc(100vw-2rem)]',
        toastVariantStyles[type],
        'overflow-hidden',
      )}
    >
      <span className={cn('shrink-0 mt-0.5', toastIconStyles[type])} aria-hidden="true">
        {ICONS[type]}
      </span>

      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
        {message && <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{message}</p>}
      </div>

      <button
        onClick={() => onRemove(id)}
        aria-label="Dismiss notification"
        className="shrink-0 p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {!paused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted overflow-hidden rounded-b-lg">
          <div
            className={cn('h-full animate-toast-progress', progressBarColors[type])}
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      )}
    </motion.div>
  );
};

export const ToastContainer = ({ toasts = [], onRemove, position = 'bottom-right' }) => {
ToastContainer.displayName = 'ToastContainer';
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
      className={cn('fixed z-toast flex flex-col gap-3', positionStyles[position])}
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

// eslint-disable-next-line react-refresh/only-export-components
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
