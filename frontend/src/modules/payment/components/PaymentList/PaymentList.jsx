import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineCalendarDays,
    HiOutlineCurrencyRupee,
    HiOutlineReceiptRefund,
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineUser,
    HiOutlineEnvelope,
    HiOutlineCreditCard,
    HiOutlineChatBubbleBottomCenterText,
    HiOutlineDocumentText,
} from 'react-icons/hi2';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { Button } from '@/shared/components/ui';

/* ── Smart date ── */
const smartDate = (date) => {
    const d = new Date(date);
    if (isToday(d))     return { primary: 'Today',     secondary: format(d, 'MMM d') };
    if (isYesterday(d)) return { primary: 'Yesterday', secondary: format(d, 'MMM d') };
    if (differenceInDays(new Date(), d) < 7) return { primary: format(d, 'EEEE'), secondary: format(d, 'MMM d') };
    return { primary: format(d, 'MMM d'), secondary: format(d, 'yyyy') };
};

/* ── Status config ── */
const STATUS = {
    completed: { label: 'Completed', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-300/60 dark:ring-emerald-400/20' },
    pending:   { label: 'Pending',   cls: 'bg-amber-500/10  text-amber-700  dark:text-amber-400  ring-amber-300/60  dark:ring-amber-400/20'  },
    failed:    { label: 'Failed',    cls: 'bg-red-500/10    text-red-700    dark:text-red-400    ring-red-300/60    dark:ring-red-400/20'    },
    refunded:  { label: 'Refunded',  cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-violet-300/60 dark:ring-violet-400/20' },
};

/* ── Type config ── */
const TYPE = {
    mess_bill: { label: 'Mess Bill', cls: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 ring-indigo-300/60 dark:ring-indigo-400/20' },
    gas_bill:  { label: 'Gas Bill',  cls: 'bg-amber-500/10  text-amber-700  dark:text-amber-400  ring-amber-300/60  dark:ring-amber-400/20'  },
    other:     { label: 'Other',     cls: 'bg-muted/50       text-muted-foreground               ring-border/40'                             },
};

/* ── Method label ── */
const methodLabel = (m) => ({ cash: '💵 Cash', online: '🌐 Online', razorpay: '⚡ Razorpay' }[m] || m);

/* ════════════════════════════════════════════
   PAYMENT CARD — grid view (memoized)
════════════════════════════════════════════ */
const PaymentCard = memo(React.forwardRef(({ payment, onEdit, onDelete, onViewInvoice, isAdmin, canEdit, index }, ref) => {
    const date  = smartDate(payment.paymentDate);
    const stat  = STATUS[payment.status] || STATUS.pending;
    const typeC = TYPE[payment.type]     || TYPE.other;
    const amount = Number(payment.amount ?? 0);

    return (
        <motion.article
            ref={ref}
            layoutId={`pcrd-${payment._id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
            className="group relative flex flex-col rounded-3xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden shadow-lg hover:shadow-xl dark:shadow-black/30 hover:shadow-indigo-500/10 dark:hover:shadow-indigo-400/10 transition-all duration-300 hover:-translate-y-1
                before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 dark:before:via-white/20 before:to-transparent
                after:absolute after:inset-x-10 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-black/5 dark:after:via-black/40 after:to-transparent"
        >
            {/* Header row: type badge + date */}
            <div className="flex items-start justify-between px-5 pt-5">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ring-1 ${typeC.cls}`}>
                    {typeC.label}
                </span>
                <div className="text-right leading-none">
                    <p className="text-xs font-semibold text-foreground">{date.primary}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{date.secondary}</p>
                </div>
            </div>

            {/* Admin: user block */}
            {isAdmin && payment.user && (
                <div className="mx-5 mt-4 rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border/50 px-4 py-2.5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <HiOutlineUser className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
                        <span className="text-sm font-semibold text-foreground truncate">{payment.user?.name}</span>
                    </div>
                    {payment.user?.email && (
                        <div className="flex items-center gap-2 min-w-0">
                            <HiOutlineEnvelope className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{payment.user.email}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Amount + status */}
            <div className="flex items-center gap-3 px-5 mt-4 flex-wrap">
                <div className="flex items-baseline gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-200 dark:ring-indigo-500/20">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">₹</span>
                    <span className="text-xl font-black tabular-nums text-indigo-700 dark:text-indigo-300">
                        {amount.toLocaleString('en-IN')}
                    </span>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ring-1 ${stat.cls}`}>{stat.label}</span>
            </div>

            {/* Month + method */}
            <div className="flex items-center gap-4 px-5 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                    <HiOutlineCalendarDays className="w-4 h-4 text-muted-foreground/50" />
                    <span className="text-sm text-foreground/80 font-medium">{payment.month}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <HiOutlineCreditCard className="w-4 h-4 text-muted-foreground/50" />
                    <span className="text-sm text-muted-foreground">{methodLabel(payment.paymentMethod)}</span>
                </div>
            </div>

            {/* Remarks */}
            {payment.remarks && (
                <div className="flex items-start gap-2 mx-5 mt-2 min-w-0">
                    <HiOutlineChatBubbleBottomCenterText className="w-4 h-4 mt-0.5 text-muted-foreground/50 flex-shrink-0" />
                    <p className="text-xs italic text-muted-foreground/70 leading-relaxed line-clamp-2">"{payment.remarks}"</p>
                </div>
            )}

            <div className="flex-1 min-h-[12px]" />
            <div className="mx-5 mt-4 h-px bg-border/40" />

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 py-4">
                {canEdit ? (
                    <>
                        {payment.type === 'mess_bill' && payment.status === 'completed' && (
                            <Button variant="secondary" size="sm" onClick={() => onViewInvoice && onViewInvoice(payment)} className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 ring-indigo-100 dark:ring-indigo-900">
                                <HiOutlineDocumentText className="w-4 h-4 mr-1" /> Invoice
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => onEdit(payment)} className="flex-1 font-semibold text-xs">
                            <HiOutlinePencilSquare className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button variant="danger" size="sm" iconOnly onClick={() => onDelete(payment._id)} aria-label="Delete">
                            <HiOutlineTrash className="w-4 h-4" />
                        </Button>
                    </>
                ) : (
                    <>
                        {payment.type === 'mess_bill' && payment.status === 'completed' && (
                            <Button variant="secondary" size="sm" onClick={() => onViewInvoice && onViewInvoice(payment)} className="flex-1 font-semibold text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 ring-indigo-100 dark:ring-indigo-900">
                                <HiOutlineDocumentText className="w-4 h-4 mr-1" /> Invoice
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => onEdit(payment)} className="flex-1 font-semibold text-xs">
                            <HiOutlineReceiptRefund className="w-4 h-4 mr-1" /> View
                        </Button>
                    </>
                )}
            </div>
        </motion.article>
    );
}));

PaymentCard.displayName = 'PaymentCard';

/* ════════════════════════════════════════════
   PAYMENT ROW — list view (memoized)
════════════════════════════════════════════ */
const PaymentRow = memo(React.forwardRef(({ payment, onEdit, onDelete, onViewInvoice, isAdmin, canEdit, index }, ref) => {
    const date  = smartDate(payment.paymentDate);
    const stat  = STATUS[payment.status] || STATUS.pending;
    const typeC = TYPE[payment.type]     || TYPE.other;
    const amount = Number(payment.amount ?? 0);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.16, delay: index * 0.025 }}
            className="group relative flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-black/5 dark:border-white/10 hover:bg-white/90 dark:hover:bg-slate-800/50 hover:border-black/10 dark:hover:border-white/20 transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden
                before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/70 dark:before:via-white/15 before:to-transparent"
        >
            {/* Icon pill */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-400/20">
                <HiOutlineCurrencyRupee className="w-4 h-4" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                {isAdmin && payment.user && (
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <HiOutlineUser className="w-3.5 h-3.5 text-muted-foreground/60" />
                            <span className="text-sm font-semibold text-foreground">{payment.user?.name}</span>
                        </div>
                        {payment.user?.email && (
                            <span className="text-xs text-muted-foreground truncate hidden sm:block">{payment.user.email}</span>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-2 flex-wrap text-sm">
                    <div className="flex items-center gap-1.5">
                        <HiOutlineCalendarDays className="w-4 h-4 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">{date.primary}</span>
                        <span className="text-muted-foreground/50 hidden sm:inline">· {date.secondary}</span>
                    </div>
                    <span className="text-muted-foreground/25">·</span>
                    <span className="font-black tabular-nums text-indigo-700 dark:text-indigo-300">
                        ₹{amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-muted-foreground/25">·</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ring-1 ${typeC.cls}`}>{typeC.label}</span>
                    {payment.remarks && (
                        <>
                            <span className="text-muted-foreground/25 hidden sm:inline">·</span>
                            <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                                <HiOutlineChatBubbleBottomCenterText className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                                <span className="text-xs italic text-muted-foreground/60 truncate max-w-[200px]">"{payment.remarks}"</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Status badge (visible on larger screens) */}
            <span className={`hidden md:inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ring-1 flex-shrink-0 ${stat.cls}`}>
                {stat.label}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 flex-shrink-0 pl-2">
                {payment.type === 'mess_bill' && payment.status === 'completed' && (
                    <Button variant="secondary" size="sm" iconOnly onClick={() => onViewInvoice && onViewInvoice(payment)} aria-label="View Invoice" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 ring-indigo-100 dark:ring-indigo-900 border-indigo-200 dark:border-indigo-800">
                        <HiOutlineDocumentText className="w-4 h-4" />
                    </Button>
                )}
                <Button variant="secondary" size="sm" iconOnly onClick={() => onEdit(payment)} aria-label={canEdit ? 'Edit' : 'View'}>
                    <HiOutlinePencilSquare className="w-4 h-4" />
                </Button>
                {canEdit && (
                    <Button variant="danger" size="sm" iconOnly onClick={() => onDelete(payment._id)} aria-label="Delete">
                        <HiOutlineTrash className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </motion.div>
    );
}));

PaymentRow.displayName = 'PaymentRow';

/* ── Empty State ── */
const EmptyState = () => (
    <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="col-span-full flex flex-col items-center gap-4 py-20 select-none"
    >
        <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/50 flex items-center justify-center">
            <HiOutlineCurrencyRupee className="w-7 h-7 text-muted-foreground/30" />
        </div>
        <div className="text-center">
            <p className="text-base font-semibold text-foreground">No payment records found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed">
                Adjust your filters or record a new payment.
            </p>
        </div>
    </motion.div>
);

/* ── Main export ── */
const PaymentList = ({ payments = [], onEdit, onDelete, onViewInvoice, isAdmin = false, viewMode = 'grid' }) => {
    if (payments.length === 0) return <EmptyState />;

    return (
        <AnimatePresence mode="wait" initial={false}>
            {viewMode === 'list' ? (
                <motion.div
                    key="list"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-2"
                >
                    <AnimatePresence mode="popLayout">
                        {payments.map((p, i) => (
                            <PaymentRow
                                key={p._id}
                                payment={p}
                                index={i}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onViewInvoice={onViewInvoice}
                                isAdmin={isAdmin}
                                canEdit={isAdmin}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <motion.div
                    key="grid"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                >
                    <AnimatePresence mode="popLayout">
                        {payments.map((p, i) => (
                            <PaymentCard
                                key={p._id}
                                payment={p}
                                index={i}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onViewInvoice={onViewInvoice}
                                isAdmin={isAdmin}
                                canEdit={isAdmin}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PaymentList;