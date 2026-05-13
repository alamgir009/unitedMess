import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineSparkles,
    HiOutlineSun,
    HiOutlineMoon,
    HiOutlineNoSymbol,
    HiOutlineExclamationTriangle
} from 'react-icons/hi2';
import { format } from 'date-fns';
import { Button } from '@/shared/components/ui';

const MEAL_TYPE_META = {
    both:  { label: 'Both Meals',    Icon: HiOutlineSparkles, color: 'text-primary bg-primary/10'       },
    day:   { label: 'Day Meal',      Icon: HiOutlineSun,      color: 'text-amber-500 bg-amber-500/10'   },
    night: { label: 'Night Meal',    Icon: HiOutlineMoon,     color: 'text-indigo-400 bg-indigo-400/10' },
    off:   { label: 'No Meal (Off)', Icon: HiOutlineNoSymbol, color: 'text-muted-foreground bg-muted/40'},
};

const DeleteMealDialog = ({ meal, onConfirm, onCancel, isDeleting }) => {
    const meta      = MEAL_TYPE_META[meal?.type] ?? MEAL_TYPE_META.both;
    const { Icon }  = meta;
    const dateLabel = meal?.date ? format(new Date(meal.date), 'EEEE, MMMM d, yyyy') : '—';

    /* Escape key handler */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape' && !isDeleting) onCancel(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onCancel, isDeleting]);

    /* Lock body scroll */
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {meal && (
                <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center">

                    {/* Backdrop */}
                    <motion.div
                        key="del-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/60 md:backdrop-blur-sm"
                        onClick={() => !isDeleting && onCancel()}
                        aria-hidden="true"
                    />

                    {/* Panel — slides up on mobile, pops in on desktop */}
                    <motion.div
                        key="del-panel"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="del-dialog-title"
                        aria-describedby="del-dialog-desc"
                        initial={{ opacity: 0, y: 56 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 56 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
                        className={[
                            'relative z-10 w-full sm:max-w-[380px] mx-auto',
                            /* Mobile: full-width bottom-sheet; Desktop: floating card */
                            'rounded-t-[28px] sm:rounded-[28px]',
                            'bg-white dark:bg-slate-900',
                            'border-t border-x sm:border border-black/[0.08] dark:border-white/10',
                            'shadow-[0_-8px_48px_rgba(0,0,0,0.22)] sm:shadow-[0_32px_72px_rgba(0,0,0,0.28)]',
                            'overflow-hidden',
                        ].join(' ')
                        }
                    >
                        {/* Top accent gradient bar */}
                        <div className="h-[3px] w-full bg-gradient-to-r from-rose-500 via-red-400 to-orange-400" />

                        {/* Drag indicator — mobile only */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden="true">
                            <div className="w-10 h-1 rounded-full bg-muted/50" />
                        </div>

                        <div className="px-6 pt-4 pb-7 sm:px-8 sm:pt-6 sm:pb-8 space-y-5">

                            {/* Warning icon */}
                            <div className="flex justify-center">
                                <div className="w-[60px] h-[60px] rounded-[18px] bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center shadow-inner">
                                    <HiOutlineExclamationTriangle className="w-7 h-7 text-rose-500" />
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="text-center space-y-1">
                                <h3 id="del-dialog-title" className="text-[17px] font-bold tracking-tight text-foreground">
                                    Delete Meal Record?
                                </h3>
                                <p id="del-dialog-desc" className="text-[13px] text-muted-foreground leading-relaxed">
                                    This is permanent and cannot be undone.
                                </p>
                            </div>

                            {/* Meal preview chip */}
                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/30 border border-border/50">
                                <div className={`p-2 rounded-xl flex-shrink-0 ${meta.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        {meta.label}
                                    </p>
                                    <p className="text-sm font-semibold text-foreground truncate">{dateLabel}</p>
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
                                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default DeleteMealDialog;
