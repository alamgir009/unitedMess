import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Dropdown Component
 * Props:
 *  - trigger: React element that opens the dropdown
 *  - items: [{ label, icon, onClick, destructive, separator, disabled }]
 *  - align: 'left' | 'right'
 *  - width: CSS value (e.g. 'w-48')
 */
const Dropdown = ({
    trigger,
    items = [],
    align = 'left',
    width = 'w-52',
    className = '',
}) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const firstItemRef = useRef(null);

    // Close on outside click or ESC
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const handleEsc = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, []);

    // Focus first item when opened
    useEffect(() => {
        if (open) setTimeout(() => firstItemRef.current?.focus(), 50);
    }, [open]);

    return (
        <div ref={containerRef} className={clsx('relative inline-block', className)}>
            {/* Trigger */}
            <div
                onClick={() => setOpen((o) => !o)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpen((o) => !o);
                    }
                }}
                aria-haspopup="menu"
                aria-expanded={open}
            >
                {trigger}
            </div>

            {/* Menu */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="dropdown"
                        role="menu"
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className={clsx(
                            'absolute z-dropdown mt-2 py-1',
                            width,
                            align === 'right' ? 'right-0' : 'left-0',
                            'glass rounded-xl shadow-xl',
                            'border border-white/20 dark:border-white/10',
                        )}
                    >
                        {items.map((item, i) => {
                            if (item.separator) {
                                return (
                                    <hr
                                        key={i}
                                        className="my-1 border-border"
                                        aria-hidden="true"
                                    />
                                );
                            }
                            return (
                                <button
                                    key={i}
                                    ref={i === 0 ? firstItemRef : undefined}
                                    role="menuitem"
                                    disabled={item.disabled}
                                    onClick={() => {
                                        item.onClick?.();
                                        setOpen(false);
                                    }}
                                    className={clsx(
                                        'w-full flex items-center gap-3 px-4 py-2.5',
                                        'text-left text-sm',
                                        'transition-colors duration-100',
                                        'focus-visible:outline-none',
                                        item.destructive
                                            ? 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10'
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

export default Dropdown;
