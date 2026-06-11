import { useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineDocumentText,
    HiOutlineFire,
    HiOutlineCurrencyRupee,
    HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Button } from '@/shared/components/ui';
import { SPRING_SNAPPY } from '@/core/utils/constants/spring';
import { fmt } from '@/core/utils/helpers/currency.helper';
import useBodyScrollLock from '@/shared/hooks/useBodyScrollLock';

const PAYMENT_TYPE_META = {
    mess_bill: { label: 'Mess Bill', Icon: HiOutlineDocumentText, color: 'text-indigo-500 bg-indigo-500/10' },
    gas_bill:  { label: 'Gas Bill',  Icon: HiOutlineFire,         color: 'text-amber-500 bg-amber-500/10'  },
    other:     { label: 'Other',     Icon: HiOutlineCurrencyRupee, color: 'text-muted-foreground bg-muted/40' },
};

const STATUS_META = {
    completed: { label: 'Paid',     cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
    pending:   { label: 'Pending',  cls: 'bg-amber-500/15  text-amber-700  dark:text-amber-300'  },
    failed:    { label: 'Failed',   cls: 'bg-red-500/15    text-red-700    dark:text-red-400'    },
    refunded:  { label: 'Refunded', cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
};

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

const panelTransition = SPRING_SNAPPY;

const fastFade = { duration: 0.18 };

const PaymentDeleteDialog = memo(({ payment, onConfirm, onCancel, isDeleting }) => {
    const isOpen = Boolean(payment);
    useBodyScrollLock(isOpen);

    const handleKeyDown = useCallback(
        (e) => { if (e.key === 'Escape' && !isDeleting) onCancel(); },
        [isDeleting, onCancel],
    );

    useEffect(() => {
        if (!isOpen) return;
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    if (typeof document === 'undefined') return null;

    const meta     = PAYMENT_TYPE_META[payment?.type] ?? PAYMENT_TYPE_META.other;
    const { Icon } = meta;
    const status   = STATUS_META[payment?.status] ?? STATUS_META.pending;
    const amount   = Number(payment?.amount ?? 0);
    const month    = payment?.month || '—';

    return createPortal(
        <AnimatePresence mode="wait">
            {isOpen && (
                <div
                    className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center"
                    style={{ isolation: 'isolate' }}
                >
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
                        style={{
                            willChange: 'transform, opacity',
                            transform: 'translateZ(0)',
                        }}
                        className={[
                            'relative z-10 w-full sm:max-w-[380px] mx-auto',
                            'rounded-t-[28px] sm:rounded-[28px]',
                            'bg-white dark:bg-slate-900',
                            'border-t border-x sm:border border-black/[0.08] dark:border-white/10',
                            'shadow-2xl',
                            'overflow-hidden',
                        ].join(' ')}
                    >
                        <div className="h-[3px] w-full bg-gradient-to-r from-rose-500 via-red-400 to-orange-400" />

                        <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden="true">
                            <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/20" />
                        </div>

                        <div className="px-6 pt-4 pb-7 sm:px-8 sm:pt-6 sm:pb-8 space-y-5">

                            <div className="flex justify-center">
                                <div className="w-[60px] h-[60px] rounded-[18px] bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center">
                                    <HiOutlineExclamationTriangle className="w-7 h-7 text-rose-500" />
                                </div>
                            </div>

                            <div className="text-center space-y-1">
                                <h3
                                    id="del-dialog-title"
                                    className="text-[17px] font-bold tracking-tight text-foreground"
                                >
                                    Delete Payment Record?
                                </h3>
                                <p
                                    id="del-dialog-desc"
                                    className="text-[13px] text-muted-foreground leading-relaxed"
                                >
                                    This is permanent and cannot be undone.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/30 border border-border/50">
                                <div className={`p-2 rounded-xl flex-shrink-0 ${meta.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        {meta.label}
                                    </p>
                                    <p className="text-sm font-semibold text-foreground truncate">
                                        ₹{fmt(amount)} · {month}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${status.cls}`}>
                                    {status.label}
                                </span>
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

PaymentDeleteDialog.displayName = 'PaymentDeleteDialog';
export default PaymentDeleteDialog;
