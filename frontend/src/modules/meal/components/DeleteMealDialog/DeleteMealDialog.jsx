import { useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineSparkles,
    HiOutlineSun,
    HiOutlineMoon,
    HiOutlineNoSymbol,
    HiOutlineExclamationTriangle,
    HiOutlineTrash,
} from 'react-icons/hi2';
import { format } from 'date-fns';
import { Button } from '@/shared/components/ui';

const MEAL_TYPE_META = {
    both: { label: 'Both Meals', Icon: HiOutlineSparkles, color: 'text-primary bg-primary/10' },
    day: { label: 'Day Meal', Icon: HiOutlineSun, color: 'text-amber-500 bg-amber-500/10' },
    night: { label: 'Night Meal', Icon: HiOutlineMoon, color: 'text-indigo-400 bg-indigo-400/10' },
    off: { label: 'No Meal (Off)', Icon: HiOutlineNoSymbol, color: 'text-muted-foreground bg-muted/40' },
};

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
const panelVariants = { hidden: { opacity: 0, y: 48 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 48 } };
const panelTransition = { type: 'spring', stiffness: 420, damping: 36, mass: 1 };
const fastFade = { duration: 0.15 };

let lockCount = 0;

function lockBodyScroll() {
    if (typeof document === 'undefined') return;
    if (lockCount === 0) {
        const scrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
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

const DeleteMealDialog = memo(({ meal, onConfirm, onCancel, isDeleting, isBulk, selectedCount, mealIds }) => {
    const isOpen = Boolean(isBulk ? mealIds?.length > 0 : meal);

    const handleKeyDown = useCallback(
        (e) => { if (e.key === 'Escape' && !isDeleting) onCancel(); },
        [isDeleting, onCancel],
    );

    useEffect(() => {
        if (!isOpen) return;
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    useEffect(() => {
        if (!isOpen) return;
        lockBodyScroll();
        return unlockBodyScroll;
    }, [isOpen]);

    const meta = isBulk ? null : (MEAL_TYPE_META[meal?.type] ?? MEAL_TYPE_META.both);
    const Icon = isBulk ? HiOutlineTrash : meta?.Icon;
    const dateLabel = meal?.date ? format(new Date(meal.date), 'EEEE, MMMM d, yyyy') : '—';
    const deleteLabel = isBulk
        ? `Delete ${selectedCount} Meal${selectedCount !== 1 ? 's' : ''}?`
        : 'Delete Meal Record?';
    const deleteDesc = isBulk
        ? `This will permanently delete ${selectedCount} meal record${selectedCount !== 1 ? 's' : ''}. This action cannot be undone.`
        : 'This is permanent and cannot be undone.';

    const content = useMemo(() => {
        if (isBulk) {
            return (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="p-2 rounded-lg flex-shrink-0 bg-rose-50 dark:bg-rose-500/10 text-rose-500">
                        <HiOutlineTrash className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            Bulk Delete
                        </p>
                        <p className="text-sm font-semibold text-foreground truncate">
                            {selectedCount} record{selectedCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                <div className={`p-2 rounded-lg flex-shrink-0 ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {meta.label}
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">
                        {dateLabel}
                    </p>
                </div>
            </div>
        );
    }, [isBulk, meta, selectedCount, dateLabel]);

    const btnLabel = useMemo(() => {
        if (isDeleting) return 'Deleting\u2026';
        return isBulk ? `Yes, Delete ${selectedCount}` : 'Yes, Delete';
    }, [isDeleting, isBulk, selectedCount]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center" style={{ isolation: 'isolate' }}>
                    <motion.div
                        key="del-backdrop"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={fastFade}
                        className="absolute inset-0 bg-black/60"
                        onClick={() => !isDeleting && onCancel()}
                        aria-hidden="true"
                    />

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
                        style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
                        className="relative z-10 w-full sm:max-w-[380px] mx-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border-t border-x sm:border border-black/[0.08] dark:border-white/10 shadow-xl overflow-hidden"
                    >
                        <div className="h-[3px] w-full bg-gradient-to-r from-rose-500 via-red-400 to-orange-400" />

                        <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden="true">
                            <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/20" />
                        </div>

                        <div className="px-6 pt-4 pb-7 sm:px-8 sm:pt-6 sm:pb-8 space-y-5">
                            <div className="flex justify-center">
                                <div className="w-[56px] h-[56px] rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center">
                                    <HiOutlineExclamationTriangle className="w-6 h-6 text-rose-500" />
                                </div>
                            </div>

                            <div className="text-center space-y-1">
                                <h3 id="del-dialog-title" className="text-base font-bold tracking-tight text-foreground">
                                    {deleteLabel}
                                </h3>
                                <p id="del-dialog-desc" className="text-xs text-muted-foreground leading-relaxed">
                                    {deleteDesc}
                                </p>
                            </div>

                            {content}

                            <div className="flex flex-col-reverse sm:flex-row gap-2.5 mt-2">
                                <Button variant="secondary" onClick={onCancel} disabled={isDeleting} className="w-full sm:flex-1">
                                    Cancel
                                </Button>
                                <Button variant="danger" onClick={onConfirm} isLoading={isDeleting} className="w-full sm:flex-1">
                                    {btnLabel}
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

DeleteMealDialog.displayName = 'DeleteMealDialog';
export default DeleteMealDialog;
