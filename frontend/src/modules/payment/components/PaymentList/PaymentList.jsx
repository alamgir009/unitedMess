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
    HiOutlineShieldCheck,
    HiOutlineIdentification,
} from 'react-icons/hi2';
import { Button } from '@/shared/components/ui';
import { formatSmartDate } from '@/core/utils/helpers/date.helper';

const STATUS = {
    completed:            { label: 'Paid',      cls: 'bg-success-bg text-success-text ring-1 ring-success-border' },
    pending:              { label: 'Pending',   cls: 'bg-warning-bg text-warning-text ring-1 ring-warning-border' },
    pending_verification: { label: 'Review',    cls: 'bg-info-bg text-info-text ring-1 ring-info-border' },
    failed:               { label: 'Failed',    cls: 'bg-danger-bg text-danger-text ring-1 ring-danger-border' },
    refunded:             { label: 'Refunded',  cls: 'bg-info-bg text-info-text ring-1 ring-info-border' },
};

const TYPE = {
    mess_bill: { label: 'Mess Bill', cls: 'bg-info-bg text-info-text ring-1 ring-info-border' },
    gas_bill:  { label: 'Gas Bill',  cls: 'bg-warning-bg text-warning-text ring-1 ring-warning-border' },
    other:     { label: 'Other',     cls: 'bg-muted/60 text-muted-foreground ring-border/40' },
};

const methodLabel = (m) => ({ cash: 'Cash', online: 'Online', razorpay: 'Razorpay', upi_manual: 'Manual UPI' }[m] || m);

const PaymentCard = memo(React.forwardRef(({ payment, onEdit, onDelete, onViewInvoice, onVerify, isAdmin, canEdit }, ref) => {
    const date   = formatSmartDate(payment.paymentDate);
    const stat   = STATUS[payment.status] || STATUS.pending;
    const typeC  = TYPE[payment.type]     || TYPE.other;
    const amount = Number(payment.amount ?? 0);

    return (
        <article
            ref={ref}
            className="group relative flex flex-col h-full rounded-xl bg-card border border-border/50 overflow-hidden depth-top hover:shadow-md transition-all duration-200"
        >
            <div className="flex items-start justify-between px-4 pt-3.5">
                <span className={`inline-flex items-center px-2.5 py-[3px] rounded-md text-[10px] font-bold uppercase tracking-wider ring-1 ${typeC.cls}`}>
                    {typeC.label}
                </span>
                <div className="text-right leading-none">
                    <p className="text-[11px] font-semibold text-foreground">{date.primary}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{date.secondary}</p>
                </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 mt-3 flex-wrap">
                <div className="flex items-baseline gap-0.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-200/80 dark:ring-indigo-500/20">
                    <span className="text-sm font-bold text-indigo-500">₹</span>
                    <span className="text-lg font-black tabular-nums text-indigo-700 dark:text-indigo-300">
                        {amount.toLocaleString('en-IN')}
                    </span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-[3px] rounded-full ring-1 ${stat.cls}`}>
                    {stat.label}
                </span>
            </div>

            {isAdmin && payment.user && (
                <div className="mx-4 mt-3 rounded-xl bg-muted/50 dark:bg-white/[0.03] border border-border/50 px-3 py-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <HiOutlineUser className="w-3 h-3 text-muted-foreground/70 flex-shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate">{payment.user?.name}</span>
                    </div>
                    {payment.user?.email && (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <HiOutlineEnvelope className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                            <span className="text-[11px] text-muted-foreground truncate">{payment.user.email}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center gap-3 px-4 mt-2.5 flex-wrap">
                <div className="flex items-center gap-1">
                    <HiOutlineCalendarDays className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-xs text-foreground/75 font-medium">{payment.month}</span>
                </div>
                <div className="flex items-center gap-1">
                    <HiOutlineCreditCard className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">{methodLabel(payment.paymentMethod)}</span>
                </div>
                {payment.paymentMethod === 'upi_manual' && payment.transactionId && (
                    <div className="flex items-center gap-1">
                        <HiOutlineIdentification className="w-3.5 h-3.5 text-muted-foreground/50" />
                        <span className="text-xs font-mono font-medium text-foreground/80">{payment.transactionId}</span>
                    </div>
                )}
            </div>

            {payment.remarks && (
                <div className="flex items-start gap-1.5 mx-4 mt-2 min-w-0">
                    <HiOutlineChatBubbleBottomCenterText className="w-3.5 h-3.5 mt-[1px] text-muted-foreground/50 flex-shrink-0" />
                    <p className="text-[11px] italic text-muted-foreground/60 leading-relaxed line-clamp-2">&ldquo;{payment.remarks}&rdquo;</p>
                </div>
            )}

            <div className="flex-1 min-h-[10px]" />

            <div className="mx-4 mt-3 h-px bg-border/40" />

            <div className="flex items-center gap-2 px-4 py-3">
                {canEdit ? (
                    <>
                        {payment.paymentMethod === 'upi_manual' && payment.status === 'pending_verification' ? (
                            <Button variant="primary" size="sm"
                                onClick={() => onVerify?.(payment)}
                                className="text-xs flex-1">
                                <HiOutlineShieldCheck className="w-3.5 h-3.5 mr-1" />
                                Verify
                            </Button>
                        ) : (
                            <>
                                {payment.type === 'mess_bill' && (
                                    <Button variant="elevated" size="sm"
                                        onClick={() => onViewInvoice?.(payment)}
                                        className="text-xs">
                                        <HiOutlineDocumentText className="w-3.5 h-3.5 mr-1" />
                                        Invoice
                                    </Button>
                                )}
                                <Button variant="secondary" size="sm" onClick={() => onEdit(payment)} className="flex-1 text-xs">
                                    <HiOutlinePencilSquare className="w-4 h-4 mr-1" /> Edit
                                </Button>
                            </>
                        )}
                        <Button variant="danger" size="sm" iconOnly onClick={() => onDelete(payment)} aria-label="Delete">
                            <HiOutlineTrash className="w-4 h-4" />
                        </Button>
                    </>
                ) : (
                    <>
                        {payment.type === 'mess_bill' && (
                            <Button variant="link" size="sm" onClick={() => onViewInvoice?.(payment)}
                                className="flex-1 text-xs">
                                <HiOutlineDocumentText className="w-3.5 h-3.5 mr-1" />
                                {payment.status === 'completed' ? 'Invoice' : 'View Bill'}
                            </Button>
                        )}
                        <Button variant="brand-subtle" size="sm" onClick={() => onEdit(payment)} className="flex-1 text-xs">
                            <HiOutlineReceiptRefund className="w-4 h-4 mr-1" /> View
                        </Button>
                    </>
                )}
            </div>
        </article>
    );
}));
PaymentCard.displayName = 'PaymentCard';

const PaymentRow = memo(React.forwardRef(({ payment, onEdit, onDelete, onViewInvoice, onVerify, isAdmin, canEdit }, ref) => {
    const date   = formatSmartDate(payment.paymentDate);
    const stat   = STATUS[payment.status] || STATUS.pending;
    const typeC  = TYPE[payment.type]     || TYPE.other;
    const amount = Number(payment.amount ?? 0);

    return (
        <div
            ref={ref}
            className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border/50 hover:bg-muted/20 transition-colors duration-200 depth-top overflow-hidden"
        >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                bg-indigo-50 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400">
                <HiOutlineCurrencyRupee className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                {isAdmin && payment.user && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                            <HiOutlineUser className="w-2.5 h-2.5 text-muted-foreground/60" />
                            <span className="text-xs font-semibold text-foreground">{payment.user?.name}</span>
                        </div>
                        {payment.user?.email && (
                            <span className="text-[11px] text-muted-foreground/60 truncate hidden sm:block">
                                {payment.user.email}
                            </span>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <div className="flex items-center gap-1">
                        <HiOutlineCalendarDays className="w-3 h-3 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">{date.primary}</span>
                        <span className="text-muted-foreground/50 hidden sm:inline">· {date.secondary}</span>
                    </div>
                    <span className="text-muted-foreground/25">·</span>
                    <div className="flex items-center gap-1">
                        <span className="font-black tabular-nums text-indigo-700 dark:text-indigo-300">
                            ₹{amount.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <span className="text-muted-foreground/25">·</span>
                    <span className={`text-[10px] font-bold px-2 py-[3px] rounded-full ring-1 ${typeC.cls}`}>{typeC.label}</span>
                    {payment.paymentMethod === 'upi_manual' && payment.transactionId && (
                        <>
                            <span className="text-muted-foreground/25">·</span>
                            <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                                <HiOutlineIdentification className="w-3 h-3" />
                                {payment.transactionId}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <span className={`hidden md:inline-flex items-center text-[10px] font-bold px-2.5 py-[3px] rounded-full ring-1 flex-shrink-0 ${stat.cls}`}>
                {stat.label}
            </span>

            <div className="flex items-center gap-1.5 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity duration-150 flex-shrink-0 pl-1">
                {canEdit && payment.paymentMethod === 'upi_manual' && payment.status === 'pending_verification' ? (
                    <Button variant="primary" size="sm"
                        onClick={() => onVerify?.(payment)}
                        aria-label="Verify UPI payment"
                        className="text-xs">
                        <HiOutlineShieldCheck className="w-3.5 h-3.5 mr-1" />
                        Verify
                    </Button>
                ) : (
                    <>
                        {payment.type === 'mess_bill' && (
                            <Button variant="icon" size="sm" iconOnly
                                onClick={() => onViewInvoice?.(payment)}
                                aria-label="View Invoice">
                                <HiOutlineDocumentText className="w-4 h-4" />
                            </Button>
                        )}
                        <Button variant="icon" size="sm" iconOnly onClick={() => onEdit(payment)} aria-label={canEdit ? 'Edit' : 'View'}>
                            <HiOutlinePencilSquare className="w-4 h-4" />
                        </Button>
                    </>
                )}
                {canEdit && (
                    <Button variant="danger" size="sm" iconOnly onClick={() => onDelete(payment)} aria-label="Delete">
                        <HiOutlineTrash className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}));
PaymentRow.displayName = 'PaymentRow';

const EmptyState = ({ hasFilters = false }) => (
    <div className="col-span-full flex flex-col items-center gap-3 py-16 select-none">
        <div className="w-12 h-12 rounded-xl bg-muted/60 dark:bg-white/[0.04] border border-border/50 flex items-center justify-center">
            <HiOutlineCurrencyRupee className="w-5 h-5 text-muted-foreground/30" />
        </div>
        <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
                {hasFilters ? 'No matching payment records' : 'No payment records found'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] mx-auto leading-relaxed">
                {hasFilters
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Record your first payment to get started.'}
            </p>
        </div>
    </div>
);

const PaymentList = ({ payments = [], onEdit, onDelete, onViewInvoice, onVerify, isAdmin = false, viewMode = 'grid', hasActiveFilters = false }) => {
    if (payments.length === 0) return <EmptyState hasFilters={hasActiveFilters} />;

    return (
        <>
            {viewMode === 'list' ? (
                <div className="flex flex-col gap-2">
                    {payments.map((p) => (
                        <PaymentRow key={p._id} payment={p}
                            onEdit={onEdit} onDelete={onDelete} onViewInvoice={onViewInvoice} onVerify={onVerify}
                            isAdmin={isAdmin} canEdit={isAdmin} />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {payments.map((p) => (
                        <PaymentCard key={p._id} payment={p}
                            onEdit={onEdit} onDelete={onDelete} onViewInvoice={onViewInvoice} onVerify={onVerify}
                            isAdmin={isAdmin} canEdit={isAdmin} />
                    ))}
                </div>
            )}
        </>
    );
};

export default PaymentList;
