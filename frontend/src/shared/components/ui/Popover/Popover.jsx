import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/core/utils/helpers/string.helper';

const Popover = ({
  trigger,
  children,
  align = 'left',
  className = '',
  width = 'w-72',
  onClose,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, close]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <div
        tabIndex={0}
        role="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {trigger}
      </div>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'absolute z-dropdown mt-2',
            width,
            align === 'right' ? 'right-0' : 'left-0',
            'surface-overlay border border-border rounded-xl shadow-lg',
            'animate-fade-up-fast',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

Popover.displayName = 'Popover';
export default Popover;
