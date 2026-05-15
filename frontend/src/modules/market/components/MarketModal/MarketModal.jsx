import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';
import { Button } from '@/shared/components/ui';

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

const MarketModal = ({ isOpen, onClose, title, children }) => {
    const isMobile = useMediaQuery('(max-width: 767px)');

    const transition = useMemo(
        () => ({
            backdrop: { duration: isMobile ? 0.1 : 0.15, ease: [0.16, 1, 0.3, 1] },
            modal: { duration: isMobile ? 0.12 : 0.18, ease: [0.16, 1, 0.3, 1] },
        }),
        [isMobile]
    );

    const initialState = isMobile
        ? { opacity: 0, scale: 0.985, y: 14 }
        : { opacity: 0, scale: 0.96, y: 24 };

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
                <div className="fixed inset-0 z-[1000] contain-[layout_style_paint]">
                    {/* Backdrop — solid overlay, no blur on mobile */}
                    <motion.button
                        aria-label="Close modal"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={transition.backdrop}
                        className="absolute inset-0 w-full h-full bg-black/60 md:bg-black/50"
                    />

                    {/* Modal */}
                    <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
                        <motion.div
                            initial={initialState}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={initialState}
                            transition={transition.modal}
                            role="dialog"
                            aria-modal="true"
                            style={{ willChange: 'transform, opacity' }}
                            className="
                                relative w-full max-w-lg overflow-hidden rounded-3xl
                                border border-black/10 dark:border-white/10
                                bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                                shadow-2xl
                                md:bg-white/95 md:dark:bg-slate-900/95
                            "
                        >
                            {/* Header */}
                            <div className="
                                relative z-10 flex items-center justify-between
                                px-4 py-4 sm:px-6 sm:py-5
                                border-b border-black/10 dark:border-white/10
                            ">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-700" />
                                    <h2 className="truncate text-lg font-semibold">
                                        {title}
                                    </h2>
                                </div>

                                <Button variant="danger" iconOnly onClick={onClose}>
                                    <HiOutlineXMark className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Body */}
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

export default MarketModal;
