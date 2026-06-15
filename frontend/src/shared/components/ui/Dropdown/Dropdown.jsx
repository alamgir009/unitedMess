import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const Dropdown = ({
  trigger,
  items = [],
  align = 'left',
  width = 'w-52',
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);

  const close = useCallback(() => {
    setOpen(false);
    setFocusedIndex(-1);
  }, []);

  useEffect(() => {
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
  }, [close]);

  useEffect(() => {
    if (open) {
      const firstEnabled = items.findIndex((i) => !i.separator && !i.disabled);
      setFocusedIndex(firstEnabled);
      setTimeout(() => itemRefs.current[firstEnabled]?.focus(), 50);
    }
  }, [open, items]);

  const handleKeyDown = useCallback((e) => {
    if (!open) return;
    const enabledItems = items.reduce((acc, item, i) => {
      if (!item.separator && !item.disabled) acc.push(i);
      return acc;
    }, []);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = enabledItems[(enabledItems.indexOf(focusedIndex) + 1) % enabledItems.length];
        setFocusedIndex(next);
        itemRefs.current[next]?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = enabledItems[(enabledItems.indexOf(focusedIndex) - 1 + enabledItems.length) % enabledItems.length];
        setFocusedIndex(prev);
        itemRefs.current[prev]?.focus();
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const activeItem = items[focusedIndex];
        if (activeItem && !activeItem.disabled && !activeItem.separator) {
          activeItem.onClick?.();
          close();
        }
        break;
      }
    }
  }, [open, items, focusedIndex, close]);

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)} onKeyDown={handleKeyDown}>
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
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {trigger}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="dropdown"
            role="menu"
            initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'absolute z-dropdown mt-2 py-1',
              width,
              align === 'right' ? 'right-0' : 'left-0',
              'surface-overlay border border-border rounded-lg shadow-lg',
            )}
          >
            {items.map((item, i) => {
              if (item.separator) {
                return (
                  <hr key={i} className="my-1 border-border" aria-hidden="true" />
                );
              }
              return (
                <button
                  key={i}
                  ref={(el) => (itemRefs.current[i] = el)}
                  role="menuitem"
                  tabIndex={focusedIndex === i ? 0 : -1}
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.();
                    close();
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 min-h-[44px]',
                    'text-left text-sm',
                    'transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:bg-muted',
                    focusedIndex === i && 'bg-muted',
                    item.destructive
                      ? 'text-danger hover:bg-danger-bg focus-visible:bg-danger-bg'
                      : 'text-foreground hover:bg-muted focus-visible:bg-muted',
                    item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                  )}
                >
                  {item.icon && (
                    <span className="shrink-0 w-4 h-4" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

Dropdown.displayName = 'Dropdown';
export default Dropdown;
