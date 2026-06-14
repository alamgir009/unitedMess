import { useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useModalAnimation } from '@/shared/hooks/useModalAnimation';
import { cn } from '@/core/utils/helpers/string.helper';
import {
    HiOutlineShoppingBag,
    HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { format } from 'date-fns';
import { Button } from '@/shared/components/ui';

let lockCount = 0;

function lockBodyScroll() {
    if (typeof document === 'undefined') return;
    if (lockCount === 0) {
        const scrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
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

const DeleteMarketDialog = memo(({ market, onConfirm, onCancel, isDeleting }) => {
    const isOpen = Boolean(market);
    const { shouldRender, exiting } = useModalAnimation(isOpen, { exitTimeout: 120 });

    const handleKeyDown = useCallback(
        (e) => { if (e.key === 'Escape' && !isDeleting) onCancel(); },
        [isDeleting, onCancel],
    );

    useEffect(() => {
        if (!shouldRender || exiting) return;
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shouldRender, exiting, handleKeyDown]);

    useEffect(() => {
        if (!shouldRender || exiting) return;
        lockBodyScroll();
        return unlockBodyScroll;
    }, [shouldRender, exiting]);

    if (typeof document === 'undefined') return null;

    const dateLabel = market?.date
        ? format(new Date(market.date), 'EEEE, MMMM d, yyyy')
        : '—';
    const amountLabel = market?.amount
        ? `₹${Number(market.amount).toLocaleString('en-IN')}`
        : '—';

    return createPortal(
        shouldRender ? (
            <div
                className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center"
                style={{ isolation: 'isolate' }}
            >
                <div
                    className={cn(
                        'absolute inset-0 bg-black/60',
                        'modal-animate-backdrop',
                        exiting ? 'modal-exit-backdrop' : 'modal-enter'
                    )}
                    onClick={() => !isDeleting && onCancel()}
                    aria-hidden="true"
                />

                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="del-dialog-title"
                    aria-describedby="del-dialog-desc"
                    style={{
                        willChange: 'transform, opacity',
                        transform: 'translateZ(0)',
                    }}
                    className={cn(
                        'relative z-10 w-full sm:max-w-[380px] mx-auto',
                        'rounded-t-2xl sm:rounded-2xl',
                        'bg-white dark:bg-slate-900',
                        'border-t border-x sm:border border-black/[0.08] dark:border-white/10',
                        'shadow-xl',
                        'overflow-hidden',
                        'modal-animate',
                        exiting ? 'modal-exit' : 'modal-enter'
                    )}
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
                            <h3
                                id="del-dialog-title"
                                className="text-base font-bold tracking-tight text-foreground"
                            >
                                Delete Market Record?
                            </h3>
                            <p
                                id="del-dialog-desc"
                                className="text-xs text-muted-foreground leading-relaxed"
                            >
                                This is permanent and cannot be undone.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                            <div className="p-2 rounded-lg flex-shrink-0 text-emerald-600 bg-emerald-50 dark:bg-emerald-400/10 dark:text-emerald-400">
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
                                className="w-full sm:flex-1"
                            >
                                {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        ) : null,
        document.body,
    );
});

DeleteMarketDialog.displayName = 'DeleteMarketDialog';
export default DeleteMarketDialog;
