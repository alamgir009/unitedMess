import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';

const useMediaQuery = (query) => {
    const getMatches = () =>
        typeof window !== 'undefined' ? window.matchMedia(query).matches : false;
    const [matches, setMatches] = useState(getMatches);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia(query);
        const handler = (e) => setMatches(e.matches);
        setMatches(mql.matches);
        mql.addEventListener?.('change', handler);
        return () => mql.removeEventListener?.('change', handler);
    }, [query]);

    return matches;
};

const PaymentModal = ({ isOpen, onClose, title, children }) => {
    const isMobile = useMediaQuery('(max-width: 767px)');

    const spring = useMemo(() => ({
        type: 'spring',
        stiffness: isMobile ? 400 : 340,
        damping: isMobile ? 40 : 34,
        mass: 0.9,
    }), [isMobile]);

    const variants = {
        hidden:  isMobile ? { opacity: 0, y: 20, scale: 0.98 } : { opacity: 0, y: 28, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1 },
    };

    useEffect(() => {
        if (!isOpen) return;
        const orig = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const esc = (e) => e.key === 'Escape' && onClose?.();
        window.addEventListener('keydown', esc);
        return () => {
            document.body.style.overflow = orig;
            window.removeEventListener('keydown', esc);
        };
    }, [isOpen, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] contain-[layout_style_paint]">
                    {/* Backdrop */}
                    <motion.button
                        aria-label="Close modal"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 w-full h-full bg-black/60 md:bg-black/55 md:backdrop-blur-sm"
                    />

                    {/* Centering wrapper */}
                    <div className="flex min-h-full items-center justify-center p-3 sm:p-5">
                        <motion.div
                            variants={variants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            transition={spring}
                            role="dialog"
                            aria-modal="true"
                            style={{ willChange: 'transform, opacity' }}
                            className="relative w-full max-w-lg rounded-3xl overflow-hidden
                                border border-black/10 dark:border-white/10
                                bg-white dark:bg-slate-900
                                shadow-2xl shadow-black/20"
                        >
                            {/* ── Header ── */}
                            <div className="relative flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 border-b border-black/8 dark:border-white/8">
                                {/* Accent bar */}
                                <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-gradient-to-b from-indigo-400 via-indigo-600 to-violet-600" />

                                <div className="flex items-center gap-3 min-w-0 pl-4">
                                    <h2 className="truncate text-lg font-bold text-foreground tracking-tight">
                                        {title}
                                    </h2>
                                </div>

                                {/* Close button */}
                                <button
                                    onClick={onClose}
                                    aria-label="Close"
                                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
                                        text-muted-foreground hover:text-foreground
                                        hover:bg-muted/60 transition-all duration-150 ml-2"
                                >
                                    <HiOutlineXMark className="w-5 h-5" />
                                </button>
                            </div>

                            {/* ── Body ── */}
                            <div
                                className="px-5 py-4 sm:px-6 sm:py-5 max-h-[82dvh] overflow-y-auto"
                                style={{ overscrollBehavior: 'contain' }}
                            >
                                {children}
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default PaymentModal;
