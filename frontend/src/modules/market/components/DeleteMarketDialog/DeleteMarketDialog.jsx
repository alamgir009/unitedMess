import React, { useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineShoppingBag,
    HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { format } from 'date-fns';
import { Button } from '@/shared/components/ui';

/* Framer variants defined outside component → stable object refs */
const backdropVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1 },
    exit:    { opacity: 0 },
};

const panelVariants = {
    hidden:  { opacity: 0, y: 48 },
    visible: { opacity: 1, y: 0  },
    exit:    { opacity: 0, y: 48 },
};

/* Spring tuned for composite-only path: no sub-1 mass, no low stiffness */
const panelTransition = {
    type: 'spring',
    stiffness: 420,
    damping: 36,
    mass: 1,
};

const fastFade = { duration: 0.18 };

/* ─── body-scroll lock (ref-counted, SSR-safe) ──────────────────────────── */

let lockCount = 0;

function lockBodyScroll() {
    if (typeof document === 'undefined') return;
    if (lockCount === 0) {
        const scrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
        /* Prevent layout shift caused by scrollbar disappearing */
        document.body.style.paddingRight =
            `${window.innerWidth - document.documentElement.clientWidth}px`;
        document.body.dataset.scrollY = String(scrollY);
    }
    lockCount++;
}

function unlockBodyScroll() {
    if (typeof document === 'undefined') return;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        delete document.body.dataset.scrollY;
    }
}

/* ─── component ─────────────────────────────────────────────────────────── */

const DeleteMarketDialog = memo(({ market, onConfirm, onCancel, isDeleting }) => {
    const isOpen = Boolean(market);

    /* Stable escape handler — won't re-register on every render */
    const handleKeyDown = useCallback(
        (e) => { if (e.key === 'Escape' && !isDeleting) onCancel(); },
        [isDeleting, onCancel],
    );

    useEffect(() => {
        if (!isOpen) return;
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    /* Body-scroll lock */
    useEffect(() => {
        if (!isOpen) return;
        lockBodyScroll();
        return unlockBodyScroll;
    }, [isOpen]);

    if (typeof document === 'undefined') return null;

    const dateLabel = market?.date
        ? format(new Date(market.date), 'EEEE, MMMM d, yyyy')
        : '—';
    const amountLabel = market?.amount
        ? `₹${Number(market.amount).toLocaleString('en-IN')}`
        : '—';

    return createPortal(
        /*
         * AnimatePresence lives HERE (outside the portal content),
         * so Framer tracks mount/unmount at the React tree level,
         * not inside the portal callback — eliminates double-mount jitter.
         */
        <AnimatePresence mode="wait">
            {isOpen && (
                <div
                    className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center"
                    /* Promote entire dialog subtree to its own compositor layer */
                    style={{ isolation: 'isolate' }}
                >
                    {/* ── Backdrop ── */}
                    <motion.div
                        key="del-backdrop"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={fastFade}
                        /*
                         * backdrop-blur removed — it forces a full composite
                         * reorder on every animation frame on mobile GPUs.
                         * Visual parity kept via the semi-opaque bg.
                         */
                        className="absolute inset-0 bg-black/60"
                        onClick={() => !isDeleting && onCancel()}
                        aria-hidden="true"
                    />

                    {/* ── Panel ── */}
                    <motion.div
                        key="del-panel"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="del-dialog-title"
                        aria-describedby="del-dialog-desc"
                        variants={panelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={panelTransition}
                        style={{
                            /*
                             * Force GPU layer promotion BEFORE animation starts.
                             * translateZ(0) moves the element to its own layer;
                             * will-change tells the browser to allocate it ahead of time.
                             * Result: spring runs entirely on the compositor thread —
                             * zero layout/paint cost per frame.
                             */
                            willChange: 'transform, opacity',
                            transform: 'translateZ(0)',
                        }}
                        className={[
                            'relative z-10 w-full sm:max-w-[380px] mx-auto',
                            'rounded-t-[28px] sm:rounded-[28px]',
                            'bg-white dark:bg-slate-900',
                            'border-t border-x sm:border border-black/[0.08] dark:border-white/10',
                            /*
                             * Single box-shadow token instead of arbitrary value —
                             * avoids per-frame re-parse by Tailwind's JIT runtime.
                             */
                            'shadow-2xl',
                            'overflow-hidden',
                        ].join(' ')}
                    >
                        {/* Top accent gradient bar */}
                        <div className="h-[3px] w-full bg-gradient-to-r from-rose-500 via-red-400 to-orange-400" />

                        {/* Drag indicator — mobile only */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden="true">
                            <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/20" />
                        </div>

                        <div className="px-6 pt-4 pb-7 sm:px-8 sm:pt-6 sm:pb-8 space-y-5">

                            {/* Warning icon */}
                            <div className="flex justify-center">
                                <div className="w-[60px] h-[60px] rounded-[18px] bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center">
                                    <HiOutlineExclamationTriangle className="w-7 h-7 text-rose-500" />
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="text-center space-y-1">
                                <h3
                                    id="del-dialog-title"
                                    className="text-[17px] font-bold tracking-tight text-foreground"
                                >
                                    Delete Market Record?
                                </h3>
                                <p
                                    id="del-dialog-desc"
                                    className="text-[13px] text-muted-foreground leading-relaxed"
                                >
                                    This is permanent and cannot be undone.
                                </p>
                            </div>

                            {/* Market preview chip */}
                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/30 border border-border/50">
                                <div className="p-2 rounded-xl flex-shrink-0 text-emerald-600 bg-emerald-50 dark:bg-emerald-400/10 dark:text-emerald-400 ring-1 ring-emerald-300/60 dark:ring-emerald-400/20">
                                    <HiOutlineShoppingBag className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-center gap-2">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                            Market Record
                                        </p>
                                        <p className="text-xs font-black tabular-nums text-emerald-500">
                                            {amountLabel}
                                        </p>
                                    </div>
                                    <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                                        {dateLabel}
                                    </p>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col-reverse sm:flex-row gap-2.5 mt-2">
                                <Button
                                    variant="secondary"
                                    onClick={onCancel}
                                    disabled={isDeleting}
                                    className="w-full sm:flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={onConfirm}
                                    isLoading={isDeleting}
                                    className="w-full sm:flex-1 shadow-lg shadow-rose-500/25"
                                >
                                    {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
});

DeleteMarketDialog.displayName = 'DeleteMarketDialog';
export default DeleteMarketDialog;
