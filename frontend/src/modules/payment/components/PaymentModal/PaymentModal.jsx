import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';
import { Button } from '@/shared/components/ui';

/* ------------------------------------------------------------------ */
/*  SSR-safe media query hook                                         */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  PaymentModal                                                      */
/* ------------------------------------------------------------------ */
const PaymentModal = ({ isOpen, onClose, title, children }) => {
    const isMobile = useMediaQuery('(max-width: 767px)');

    const easing = useMemo(() => [0.16, 1, 0.3, 1], []);

    const transition = useMemo(
        () => ({
            backdrop: { duration: isMobile ? 0.12 : 0.18, ease: easing },
            modal: { duration: isMobile ? 0.16 : 0.2, ease: easing },
        }),
        [isMobile, easing]
    );

    const initialState = isMobile
        ? { opacity: 0, scale: 0.985, y: 14 }
        : { opacity: 0, scale: 0.96, y: 24 };

    /* ---------------- Body Scroll Lock + ESC ---------------- */
    useEffect(() => {
        if (!isOpen) return;

        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const esc = (e) => e.key === 'Escape' && onClose?.();
        window.addEventListener('keydown', esc);

        return () => {
            document.body.style.overflow = original;
            window.removeEventListener('keydown', esc);
        };
    }, [isOpen, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000]">
                    {/* ---------------- Backdrop ---------------- */}
                    <motion.button
                        aria-label="Close modal"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={transition.backdrop}
                        className={`
              absolute inset-0 w-full h-full
              bg-black/70
              md:bg-black/50 md:backdrop-blur-sm
            `}
                    />

                    {/* ---------------- Modal ---------------- */}
                    <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
                        <motion.div
                            initial={initialState}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={initialState}
                            transition={transition.modal}
                            role="dialog"
                            aria-modal="true"
                            className={`
                relative w-full max-w-lg overflow-hidden rounded-3xl
                border
                shadow-[0_20px_80px_rgba(0,0,0,0.25)]
                
                /* LIGHT MODE */
                bg-white border-black/10 text-slate-900
                
                /* DARK MODE */
                dark:bg-slate-900 dark:border-white/10 dark:text-white
                
                /* DESKTOP GLASS ONLY */
                md:bg-white/70 md:backdrop-blur-xl
                md:dark:bg-slate-900/60
              `}>
                            {/* -------- Mobile solid layer (no transparency leak) -------- */}
                            <div
                                className="
                                absolute inset-0 md:hidden
                                    
                                /* Light mode – ultra subtle warm tint */
                                bg-[rgb(231,235,240)]
                                    
                                /* Dark mode */
                                dark:bg-[rgb(15,23,42)]"/>

                            {/* -------- Subtle Glow -------- */}
                            <div className="
                pointer-events-none absolute top-0 left-1/2 -translate-x-1/2
                w-72 h-24 rounded-full
                bg-indigo-500/10
                blur-2xl md:blur-3xl
              " />

                            {/* -------- Border refinement -------- */}
                            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-black/5 dark:border-white/10" />

                            {/* ---------------- Header ---------------- */}
                            <div className="
                relative z-10 flex items-center justify-between
                px-4 py-4 sm:px-6 sm:py-5
                border-b border-black/10 dark:border-white/10
              ">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-700" />
                                    <h2 className="truncate text-lg font-semibold">
                                        {title}
                                    </h2>
                                </div>

                                <Button variant="danger" iconOnly onClick={onClose}>
                                    <HiOutlineXMark className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* ---------------- Body ---------------- */}
                            <div className="
                relative z-10 px-4 py-4 sm:px-6 sm:py-5
                max-h-[82dvh] overflow-y-auto
              ">
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