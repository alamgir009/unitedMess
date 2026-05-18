import React, { memo } from 'react';
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
import { Button } from '@/shared/components/ui';
import { formatSmartDate } from '@/core/utils/helpers/date.helper';

const STATUS = {
    completed: { label: 'Paid',      cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-400/30' },
    pending:   { label: 'Pending',   cls: 'bg-amber-500/15  text-amber-700  dark:text-amber-300  ring-amber-400/30'  },
    failed:    { label: 'Failed',    cls: 'bg-red-500/15    text-red-700    dark:text-red-400    ring-red-400/30'    },
    refunded:  { label: 'Refunded',  cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-violet-400/30' },
};

const TYPE = {
    mess_bill: { label: 'Mess Bill', cls: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-400/30' },
    gas_bill:  { label: 'Gas Bill',  cls: 'bg-amber-500/15  text-amber-700  dark:text-amber-300  ring-amber-400/30'  },
    other:     { label: 'Other',     cls: 'bg-muted/60 text-muted-foreground ring-border/40' },
};

const methodLabel = (m) => ({ cash: 'Cash', online: 'Online', razorpay: 'Razorpay' }[m] || m);

/* ── Grid Card ── */
const PaymentCard = memo(React.forwardRef(({ payment, onEdit, onDelete, onViewInvoice, isAdmin, canEdit, index }, ref) => {
    const date   = formatSmartDate(payment.paymentDate);
    const stat   = STATUS[payment.status] || STATUS.pending;
    const typeC  = TYPE[payment.type]     || TYPE.other;
    const amount = Number(payment.amount ?? 0);

    return (
        <article
            ref={ref}
            className="group relative flex flex-col h-full rounded-2xl bg-card/75 dark:bg-slate-900/60
                border border-black/6 dark:border-white/10
                shadow-sm hover:shadow-md dark:shadow-black/30
                transition-shadow duration-200 overflow-hidden"
        >
            {/* top shimmer */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

            {/* ── Top row ── */}
            <div className="flex items-start justify-between px-4 pt-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 ${typeC.cls}`}>
                    {typeC.label}
                </span>
                <div className="text-right leading-none">
                    <p className="text-xs font-semibold text-foreground">{date.primary}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{date.secondary}</p>
                </div>
            </div>

            {/* ── Amount + status ── */}
            <div className="flex items-center gap-2.5 px-4 mt-3.5 flex-wrap">
                <div className="flex items-baseline gap-0.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-200/80 dark:ring-indigo-500/20">
                    <span className="text-sm font-bold text-indigo-500">₹</span>
                    <span className="text-xl font-black tabular-nums text-indigo-700 dark:text-indigo-300">
                        {amount.toLocaleString('en-IN')}
                    </span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ring-1 ${stat.cls}`}>
                    {stat.label}
                </span>
            </div>

            {/* ── Admin user block ── */}
            {isAdmin && payment.user && (
                <div className="mx-4 mt-3 rounded-xl bg-muted/30 dark:bg-white/[0.03] border border-border/40 px-3 py-2 space-y-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <HiOutlineUser className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate">{payment.user?.name}</span>
                    </div>
                    {payment.user?.email && (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <HiOutlineEnvelope className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                            <span className="text-[10px] text-muted-foreground truncate">{payment.user.email}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Meta row ── */}
            <div className="flex items-center gap-3 px-4 mt-2.5 flex-wrap">
                <div className="flex items-center gap-1">
                    <HiOutlineCalendarDays className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-xs text-foreground/75 font-medium">{payment.month}</span>
                </div>
                <div className="flex items-center gap-1">
                    <HiOutlineCreditCard className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">{methodLabel(payment.paymentMethod)}</span>
                </div>
            </div>

            {/* ── Remarks ── */}
            {payment.remarks && (
                <div className="flex items-start gap-1.5 mx-4 mt-2 min-w-0">
                    <HiOutlineChatBubbleBottomCenterText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/40 flex-shrink-0" />
                    <p className="text-[10px] italic text-muted-foreground/60 leading-relaxed line-clamp-2">"{payment.remarks}"</p>
                </div>
            )}

            <div className="flex-1 min-h-3" />

            {/* ── Divider ── */}
            <div className="mx-4 mt-3 h-px bg-border/30" />

            {/* ── Actions ── */}
            <div className="flex items-center gap-1.5 px-4 py-3">
                {canEdit ? (
                    <>
                        {payment.type === 'mess_bill' && (
                            <Button variant="secondary" size="sm"
                                onClick={() => onViewInvoice?.(payment)}
                                className="text-xs text-indigo-600 dark:text-indigo-400">
                                <HiOutlineDocumentText className="w-3.5 h-3.5 mr-1" />
                                Invoice
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => onEdit(payment)} className="flex-1 text-xs">
                            <HiOutlinePencilSquare className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button variant="danger" size="sm" iconOnly onClick={() => onDelete(payment)} aria-label="Delete">
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                        </Button>
                    </>
                ) : (
                    <>
                        {payment.type === 'mess_bill' && (
                            <Button variant="secondary" size="sm" onClick={() => onViewInvoice?.(payment)}
                                className="flex-1 text-xs text-indigo-600 dark:text-indigo-400">
                                <HiOutlineDocumentText className="w-3.5 h-3.5 mr-1" />
                                {payment.status === 'completed' ? 'Invoice' : 'View Bill'}
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => onEdit(payment)} className="flex-1 text-xs">
                            <HiOutlineReceiptRefund className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                    </>
                )}
            </div>
        </article>
    );
}));
PaymentCard.displayName = 'PaymentCard';

/* ── List Row ── */
const PaymentRow = memo(React.forwardRef(({ payment, onEdit, onDelete, onViewInvoice, isAdmin, canEdit, index }, ref) => {
    const date   = formatSmartDate(payment.paymentDate);
    const stat   = STATUS[payment.status] || STATUS.pending;
    const typeC  = TYPE[payment.type]     || TYPE.other;
    const amount = Number(payment.amount ?? 0);

    return (
        <div
            ref={ref}
            className="relative flex items-center gap-3 px-4 py-3 rounded-2xl
                bg-card/70 dark:bg-slate-900/45
                border border-black/5 dark:border-white/10
                hover:bg-card/90 dark:hover:bg-slate-800/55
                transition-colors duration-200 shadow-sm hover:shadow-md overflow-hidden"
        >
            {/* Icon */}
            <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                bg-indigo-50 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400
                ring-1 ring-indigo-200/80 dark:ring-indigo-400/20">
                <HiOutlineCurrencyRupee className="w-4 h-4" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                {isAdmin && payment.user && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                            <HiOutlineUser className="w-3 h-3 text-muted-foreground/60" />
                            <span className="text-sm font-semibold text-foreground">{payment.user?.name}</span>
                        </div>
                        {payment.user?.email && (
                            <span className="text-[10px] text-muted-foreground truncate hidden sm:block">
                                {payment.user.email}
                            </span>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-2 flex-wrap text-sm">
                    <div className="flex items-center gap-1">
                        <HiOutlineCalendarDays className="w-3.5 h-3.5 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">{date.primary}</span>
                        <span className="text-muted-foreground/40 hidden sm:inline">· {date.secondary}</span>
                    </div>
                    <span className="text-muted-foreground/25">·</span>
                    <span className="font-black tabular-nums text-indigo-700 dark:text-indigo-300">
                        ₹{amount.toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${typeC.cls}`}>{typeC.label}</span>
                </div>
            </div>

            {/* Status (desktop) */}
            <span className={`hidden md:inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full ring-1 flex-shrink-0 ${stat.cls}`}>
                {stat.label}
            </span>

            {/* Actions — always visible on mobile */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {payment.type === 'mess_bill' && (
                    <Button variant="secondary" size="sm" iconOnly
                        onClick={() => onViewInvoice?.(payment)}
                        aria-label="View Invoice"
                        className="text-indigo-600 dark:text-indigo-400">
                        <HiOutlineDocumentText className="w-3.5 h-3.5" />
                    </Button>
                )}
                <Button variant="secondary" size="sm" iconOnly onClick={() => onEdit(payment)} aria-label={canEdit ? 'Edit' : 'View'}>
                    <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                </Button>
                {canEdit && (
                    <Button variant="danger" size="sm" iconOnly onClick={() => onDelete(payment)} aria-label="Delete">
                        <HiOutlineTrash className="w-3.5 h-3.5" />
                    </Button>
                )}
            </div>
        </div>
    );
}));
PaymentRow.displayName = 'PaymentRow';

/* ── Empty State ── */
const EmptyState = () => (
    <div className="col-span-full flex flex-col items-center gap-4 py-24 select-none">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center">
            <HiOutlineCurrencyRupee className="w-7 h-7 text-muted-foreground/25" />
        </div>
        <div className="text-center">
            <p className="text-base font-semibold text-foreground">No payment records found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed">
                Adjust your filters or record a new payment.
            </p>
        </div>
    </div>
);

/* ── Main export ── */
const PaymentList = ({ payments = [], onEdit, onDelete, onViewInvoice, isAdmin = false, viewMode = 'grid' }) => {
    if (payments.length === 0) return <EmptyState />;

    return (
        <>
            {viewMode === 'list' ? (
                <div className="flex flex-col gap-2">
                    {payments.map((p, i) => (
                        <PaymentRow key={p._id} payment={p} index={i}
                            onEdit={onEdit} onDelete={onDelete} onViewInvoice={onViewInvoice}
                            isAdmin={isAdmin} canEdit={isAdmin} />
                    ))}
                </div>
            ) : (
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}
                >
                    {payments.map((p, i) => (
                        <PaymentCard key={p._id} payment={p} index={i}
                            onEdit={onEdit} onDelete={onDelete} onViewInvoice={onViewInvoice}
                            isAdmin={isAdmin} canEdit={isAdmin} />
                    ))}
                </div>
            )}
        </>
    );
};

export default PaymentList;
