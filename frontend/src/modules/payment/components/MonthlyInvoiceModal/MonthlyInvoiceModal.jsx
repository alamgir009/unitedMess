import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useModalAnimation } from '@/shared/hooks/useModalAnimation';
import { cn } from '@/core/utils/helpers/string.helper';
import {
    HiOutlineXMark,
    HiOutlineDocumentText,
    HiOutlineExclamationTriangle,
    HiOutlineCurrencyRupee,
    HiOutlineArrowPath,
    HiOutlineClock,
} from 'react-icons/hi2';

import MessBillInvoice from '../MessBillInvoice/MessBillInvoice';
import { fetchMonthlyInvoice, clearMonthlyInvoice } from '../../store/invoice.slice';
import { fmt } from '@/core/utils/helpers/currency.helper';

const toPaymentStatus = (invoiceStatus) => {
    switch (invoiceStatus) {
        case 'paid':           return 'success';
        case 'partially_paid': return 'partially_paid';
        case 'unpaid':
        default:               return 'pending';
    }
};

const toInvoiceDisplayData = (invoice) => {
    if (!invoice) return null;
    return {
        grandTotalMarketAmount: invoice.marketAmountSpent  ?? 0,
        grandTotalMeal:         invoice.mealCount          ?? 0,
        totalGuestRevenue:      invoice.guestMealRevenue   ?? 0,
        adjustedMealCharge:     invoice.messCost           ?? 0,
        payableAmount:          invoice.totalPayable       ?? 0,
        monthName:              invoice.monthName,
        userStats: {
            totalMeal:           invoice.mealCount          ?? 0,
            totalMarketAmount:   invoice.marketAmountSpent  ?? 0,
            waterBill:           invoice.fixedCosts?.waterBill      ?? 0,
            cookingCharge:       invoice.fixedCosts?.cookingCharge  ?? 0,
            costOfMeals:         invoice.messCost            ?? 0,
            guestMeal:           invoice.guestMealCount      ?? 0,
            chargePerGuestMeal:  60,
            guestMealAmount:     invoice.guestMealRevenue    ?? 0,
            gasBillCharge:       invoice.fixedCosts?.gasBillCharge  ?? 0,
        },
        platformFee: invoice.fixedCosts?.platformFee ?? 0,
    };
};

const InvoiceSkeleton = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-muted rounded-2xl w-full" />
        <div className="h-16 bg-muted rounded-2xl w-full" />
        <div className="h-56 bg-muted rounded-2xl w-full" />
        <div className="h-20 bg-muted rounded-2xl w-full" />
    </div>
);

const PartialPaymentBanner = ({ remainingAmount, paidAmount, totalPayable, onPayNow, isPaying, monthName }) => {
    const paidPercent = totalPayable > 0
        ? Math.min(100, Math.round((paidAmount / totalPayable) * 100))
        : 0;

    return (
        <div className="rounded-xl border border-warning-border bg-warning-bg overflow-hidden">
            <div className="h-1.5 bg-warning-bg w-full">
                <div
                    className="h-full bg-gradient-to-r from-warning to-warning rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${paidPercent}%` }}
                />
            </div>

            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-warning-bg flex items-center justify-center">
                        <HiOutlineClock className="w-5 h-5 text-warning-text" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-warning-text">
                            Partial Payment Received — Balance Due
                        </p>
                        <p className="text-xs text-warning-text/80 mt-0.5 leading-relaxed">
                            You&apos;ve paid <span className="font-semibold">₹{fmt(paidAmount)}</span> ({paidPercent}%) of
                            your total bill of <span className="font-semibold">₹{fmt(totalPayable)}</span>.
                            Please pay the remaining{' '}
                            <span className="font-bold text-warning-text">
                                ₹{fmt(remainingAmount)}
                            </span>{' '}
                            to clear your balance.
                        </p>
                    </div>
                </div>

                {onPayNow && (
                    <button
                        type="button"
                        disabled={!!isPaying}
                        onClick={() => onPayNow(monthName)}
                        className="touch-target mt-3 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg
                            bg-warning hover:brightness-90 text-white text-sm font-bold
                            shadow-md hover:shadow-lg
                            disabled:opacity-60 disabled:cursor-not-allowed transition-[transform,opacity] duration-100 ease-out
                            active:scale-[0.98]"
                    >
                        {isPaying ? (
                            <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                        ) : (
                            <HiOutlineCurrencyRupee className="w-4 h-4" />
                        )}
                        <span>{isPaying ? 'Processing…' : `Pay Remaining ₹${fmt(remainingAmount)}`}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

const MonthlyInvoiceModal = ({
    isOpen,
    onClose,
    year,
    month,
    monthName,
    onPayNow,
    isPaying,
    paymentRecord: externalPaymentRecord,
    userId,
}) => {
    const dispatch = useDispatch();
    const { monthlyInvoice, isLoadingMonthly, error } = useSelector((state) => state.invoice);
    const { user } = useSelector((state) => state.auth);
    const { shouldRender, exiting } = useModalAnimation(isOpen, { exitTimeout: 120 });

    useEffect(() => {
        if (!shouldRender || exiting) return;

        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleEsc);

        if (year && month) {
            dispatch(fetchMonthlyInvoice({ year, month, userId }));
        }

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEsc);
            dispatch(clearMonthlyInvoice());
        };
    }, [shouldRender, exiting, year, month, userId, dispatch, onClose]);

    const handleClose = useCallback(() => onClose(), [onClose]);

    if (!shouldRender) return null;

    const displayData      = toInvoiceDisplayData(monthlyInvoice);
    const invoiceStatus    = monthlyInvoice?.status ?? 'unpaid';
    const paymentStatus    = toPaymentStatus(invoiceStatus);
    const isFinalized      = monthlyInvoice?.isFinalized ?? false;
    const isPartiallyPaid  = invoiceStatus === 'partially_paid';
    const paidAmount       = monthlyInvoice?.paidAmount    ?? 0;
    const totalPayable     = monthlyInvoice?.totalPayable  ?? 0;
    const remainingAmount  = monthlyInvoice?.remainingAmount
        ?? Math.max(0, totalPayable - paidAmount);

    const invoicePaymentRecord = {
        month:       monthlyInvoice?.monthName,
        paymentDate: monthlyInvoice?.createdAt,
        paidAmount,
        totalPayable,
        remainingAmount,
        ...(externalPaymentRecord || {}),
    };

    return (
        <div className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6',
            'modal-animate-backdrop',
            exiting ? 'modal-exit-backdrop' : 'modal-enter'
        )}>
            <div
                className="absolute inset-0 bg-overlay"
                onClick={handleClose}
                aria-hidden="true"
            />

            <div
                className={cn(
                    'relative w-full max-w-2xl max-h-[90vh] flex flex-col',
                    'rounded-3xl bg-card border border-border shadow-2xl overflow-hidden',
                    'modal-animate modal-gpu',
                    exiting ? 'modal-exit' : 'modal-enter'
                )}
                role="dialog"
                aria-modal="true"
                aria-label="Invoice Details"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <HiOutlineDocumentText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">
                                Invoice Details
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {monthName || monthlyInvoice?.monthName || ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isLoadingMonthly && monthlyInvoice && (
                            <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                invoiceStatus === 'paid'
                                    ? 'bg-success-bg text-success-text'
                                    : invoiceStatus === 'partially_paid'
                                        ? 'bg-warning-bg text-warning-text'
                                        : 'bg-muted text-muted-foreground'
                            }`}>
                                {invoiceStatus === 'paid'
                                    ? '✓ Paid'
                                    : invoiceStatus === 'partially_paid'
                                        ? '⏳ Partially Paid'
                                        : isFinalized ? 'Finalized' : 'Unpaid'}
                            </span>
                        )}

                        <button
                            id="monthly-invoice-modal-close"
                            onClick={handleClose}
                            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            aria-label="Close invoice modal"
                        >
                            <HiOutlineXMark className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 custom-scrollbar bg-muted/50">
                    {isLoadingMonthly && <InvoiceSkeleton />}

                    {!isLoadingMonthly && error && (
                        <div className="p-6 text-center bg-destructive/10 rounded-2xl border border-destructive/20">
                            <HiOutlineExclamationTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
                            <p className="font-semibold text-destructive mb-1">
                                Failed to load invoice
                            </p>
                            <p className="text-sm text-destructive/80">{error}</p>
                            <button
                                onClick={() => dispatch(fetchMonthlyInvoice({ year, month }))}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
                            >
                                <HiOutlineArrowPath className="w-4 h-4" />
                                Try Again
                            </button>
                        </div>
                    )}

                    {!isLoadingMonthly && !error && displayData && (
                        <>
                            {isPartiallyPaid && (
                                <PartialPaymentBanner
                                    remainingAmount={remainingAmount}
                                    paidAmount={paidAmount}
                                    totalPayable={totalPayable}
                                    onPayNow={onPayNow}
                                    isPaying={isPaying}
                                    monthName={monthlyInvoice?.monthName || monthName}
                                />
                            )}

                            <MessBillInvoice
                                data={displayData}
                                user={user}
                                platformFee={displayData.platformFee}
                                paymentStatus={paymentStatus}
                                paymentRecord={invoicePaymentRecord}
                                onPayNow={!isPartiallyPaid && paymentStatus !== 'success' ? onPayNow : undefined}
                                isPaying={isPaying}
                            />
                        </>
                    )}

                    {!isLoadingMonthly && !error && !displayData && (
                        <div className="py-16 text-center">
                            <HiOutlineDocumentText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">
                                No invoice data found for this period.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MonthlyInvoiceModal;
